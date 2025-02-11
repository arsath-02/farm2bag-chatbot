from flask import Flask, request, jsonify
from flask_cors import CORS
import httpx
import time
import json
import jwt  # ✅ Import JWT for authentication
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError  # ✅ Correct import
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langdetect import detect
from groq import Groq
from pymongo import MongoClient
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError  # Proper exception import


# ✅ Initialize Flask App
app = Flask(__name__)
CORS(app)

# ✅ Load API Key for Groq
GROQ_API_KEY = "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"
if not GROQ_API_KEY:
    raise ValueError("❌ GROQ API Key is missing.")

# ✅ Initialize Groq Client
client = Groq(api_key=GROQ_API_KEY)

# ✅ Connect to Local MongoDB
MONGO_URI = "mongodb://localhost:27017/"
client_mongo = MongoClient(MONGO_URI)
db = client_mongo["chatbotDB"]
products_collection = db["products"]

print("✅ Connected to Local MongoDB!")

# ✅ Initialize LangChain Memory
memory = ConversationBufferMemory(return_messages=True)

# ✅ JWT Secret Key (Change this in production)
JWT_SECRET = "your_secret_key_here"

# ✅ Extract Farmer ID from Token
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

JWT_SECRET = "your_secret_key_here"

def extract_farmer_id_from_token(token):
    """Decodes JWT token and extracts the farmer ID."""
    try:
        print(f"🔑 Received Token: {token}")  # Debugging

        # ✅ Decode JWT Token
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        print(f"✅ Decoded Token: {decoded}")  # Debugging

        # ✅ Ensure 'id' field exists in the payload
        farmer_id = decoded.get("id")
        if not farmer_id:
            print("❌ Farmer ID missing in token.")
            return None
        return farmer_id

    except ExpiredSignatureError:
        print("❌ Token Expired")
        return None
    except InvalidTokenError:
        print("❌ Invalid Token Signature")
        return None
    except jwt.DecodeError:
        print("❌ JWT Decode Error: Token format incorrect")
        return None
    except Exception as e:
        print(f"❌ Token Decoding Error: {e}")
        return None



# ✅ Define Prompt Template
prompt_template = PromptTemplate(
    input_variables=["user_type", "history", "user_query", "language"],
    template="""
    You are an AI assistant helping {user_type} with agricultural product management.

    **User Type**: {user_type}
    **Conversation History**: {history}
    **User Query**: {user_query}
    **Language**: {language}

    **For Farmers**:
    - Assist in **adding, updating, or removing products**.
    - Confirm **product name, quantity, and price** before saving.
    - Provide **market price trends and seasonal insights**.

    **For Customers**:
    - Assist in **placing orders**.
    - Confirm **product availability, quantity, and price**.
    - Suggest alternatives if a product is out of stock.

    The response should be in the **same language** as the user query.

    Be accurate and structured in responses.
    """
)

# ✅ Query Groq AI
def query_groq(message):
    """Sends user message to Groq AI and ensures valid JSON response."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            completion = client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {"role": "system", "content": "Extract intent and product details in pure JSON format. Ensure all product names are in lowercase."},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=512,
                top_p=1,
                stream=False
            )

            groq_response = completion.choices[0].message.content.strip()
            print(f"🔍 Groq Raw Response: {groq_response}")

            # ✅ Ensure valid JSON response
            intent_data = json.loads(groq_response)

            # ✅ Convert product name to lowercase
            if "productDetails" in intent_data:
                intent_data["productDetails"]["product"] = intent_data["productDetails"].get("product", "").lower()

            return {
                "intent": intent_data.get("intent", "unknown"),
                "entities": intent_data.get("productDetails", {}),
            }
        except (httpx.RequestError, json.JSONDecodeError):
            return {"intent": "error", "entities": {}}

# ✅ Save Product to MongoDB
def save_product_to_db(intent_data, farmer_id):
    """Saves or updates product details for a farmer."""
    if intent_data["intent"] == "AddProduct":
        product_data = intent_data["entities"]
        if product_data and "product" in product_data:
            product_name = product_data["product"].lower()
            price = product_data.get("price", 0)
            quantity = product_data.get("quantity", 0)

            existing_product = products_collection.find_one({"product": product_name, "farmerId": farmer_id})

            if existing_product:
                update_query = {"product": product_name, "farmerId": farmer_id}
                update_data = {"$set": {"price": price, "quantity": quantity}}
                products_collection.update_one(update_query, update_data)
                return f"🔄 Updated '{product_name}' for farmer {farmer_id}."
            else:
                product_data["farmerId"] = farmer_id
                product_data["product"] = product_name
                products_collection.insert_one(product_data)
                return f"✅ Product '{product_name}' added successfully for farmer {farmer_id}."

# ✅ Update Product in MongoDB
def update_product_in_db(intent_data, farmer_id):
    """Updates product details for a farmer."""
    if intent_data["intent"] == "UpdateProduct":
        product_data = intent_data["entities"]
        product_name = product_data.get("product")
        new_price = product_data.get("price")

        if not product_name:
            return "❌ Product name is required for update."

        product_name = product_name.lower()
        query = {"product": product_name, "farmerId": farmer_id}
        update_data = {"$set": {"price": new_price}}

        result = products_collection.update_one(query, update_data)
        return f"✅ Updated '{product_name}' price to ₹{new_price}/kg." if result.matched_count else f"❌ '{product_name}' not found for farmer {farmer_id}."

# ✅ Check Product Availability
def check_product_availability(product_name, farmer_id):
    """Checks if the requested product is available."""
    product_name = product_name.lower()
    query = {"product": product_name, "farmerId": farmer_id}

    print(f"🔍 Checking availability with query: {query}")
    product = products_collection.find_one(query)

    return f"✅ '{product_name}' is available: {product['quantity']} kg at ₹{product['price']}/kg." if product else f"❌ '{product_name}' not found for farmer {farmer_id}."

# ✅ Process User Query
def chat_bot(message, user_type, farmer_id):
    """Processes user query, extracts intent, and checks product availability."""
    intent_data = query_groq(message)
    extracted_entities = intent_data["entities"]
    product_name = extracted_entities.get("product")

    if intent_data["intent"] == "AddProduct":
        return save_product_to_db(intent_data, farmer_id)
    if intent_data["intent"] == "CheckAvailability":
        return check_product_availability(product_name, farmer_id)
    if intent_data["intent"] == "UpdateProduct":
        return update_product_in_db(intent_data, farmer_id)

    return "🤖 Unable to process request."

# ✅ API Endpoint
@app.route('/predict', methods=['POST'])
def chatbot():
    """Handles user messages and processes queries."""
    data = request.json
    user_message = data.get("message", "")
    token = request.headers.get("Authorization")

    # ✅ Debugging: Print the received token
    print(f"🔑 Received Token: {token}")

    if not token:
        return jsonify({"error": "❌ Unauthorized. Token missing."}), 401

    # ✅ Fix Token Parsing (Remove "Bearer " prefix)
    token = token.replace("Bearer ", "").strip()

    # ✅ Debugging: Print cleaned token
    print(f"🔑 Cleaned Token: {token}")

    farmer_id = extract_farmer_id_from_token(token)

    if not farmer_id:
        return jsonify({"error": "❌ Invalid token."}), 401

    response = chat_bot(user_message, data.get("user_type", "customer"), farmer_id)
    return jsonify({"response": response})


# ✅ Run Flask
if __name__ == "__main__":
    print("🚀 Running Flask Locally on port 8080...")
    app.run(host="0.0.0.0", port=8080, debug=True)
