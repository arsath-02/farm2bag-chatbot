from flask import Flask, request, jsonify
from flask_cors import CORS
import httpx
import json
import re
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from groq import Groq
from pymongo import MongoClient

# Initialize Flask App
app = Flask(__name__)
CORS(app)

# Load API Key for Groq
GROQ_API_KEY = "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"
if not GROQ_API_KEY:
    raise ValueError("❌ GROQ API Key is missing.")

# Initialize Groq Client
client = Groq(api_key=GROQ_API_KEY)

# Connect to Local MongoDB
MONGO_URI = "mongodb://localhost:27017/"
client_mongo = MongoClient(MONGO_URI)
db = client_mongo["chatbotDB"]
products_collection = db["products"]

print("✅ Connected to Local MongoDB!")

# Initialize LangChain Memory
memory = ConversationBufferMemory(return_messages=True)

# Define Prompt Template
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

# Query Groq AI
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

            # Extract JSON part from the response
            json_match = re.search(r'\{.*\}', groq_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                intent_data = json.loads(json_str)
                print(f"🔍 Extracted JSON: {json_str}")
            else:
                print("❌ No JSON object found in the response")
                return {"intent": "error", "entities": {}}

            # Convert product name to lowercase
            if "product" in intent_data:
                intent_data["product"]["name"] = intent_data["product"].get("name", "").lower()

            return {
                "intent": intent_data.get("intent", "unknown"),
                "entities": intent_data.get("product", {}),
            }
        except (httpx.RequestError, json.JSONDecodeError) as e:
            print(f"❌ Error querying Groq: {e}")
            return {"intent": "error", "entities": {}}

# Process User Query
def chat_bot(message, user_type, farmer_id):
    """Processes user query, extracts intent, and returns product details."""
    intent_data = query_groq(message)
    extracted_entities = intent_data["entities"]
    product_name = extracted_entities.get("name")

    print(f"🔍 Intent Data: {intent_data}")
    print(f"🔍 Extracted Entities: {extracted_entities}")

    if intent_data["intent"] == "add_product":
        return {"intent": "add_product", "entities": extracted_entities}
    if intent_data["intent"] == "check_availability":
        return {"intent": "check_availability", "entities": extracted_entities}
    if intent_data["intent"] == "update_product":
        return {"intent": "update_product", "entities": extracted_entities}
    if intent_data["intent"] == "view_listings" or intent_data["intent"] == "view_current_listings":
        return {"intent": "view_listings", "entities": extracted_entities}

    return {"intent": "unknown", "entities": {}}

# Check Product Availability
def check_product_availability(product_name, farmer_id):
    """Checks if the requested product is available."""
    product_name = product_name.lower()
    query = {"name": product_name, "farmerId": farmer_id}

    print(f"🔍 Checking availability with query: {query}")
    product = products_collection.find_one(query)

    return f"✅ '{product_name}' is available: {product['quantity']} kg at ₹{product['price']}/kg." if product else f"❌ '{product_name}' not found for farmer {farmer_id}."

# View Listings
def view_listings(farmer_id):
    """Returns the current product listings for the farmer."""
    products = products_collection.find({"farmerId": farmer_id})
    listings = [{"name": product["name"], "quantity": product["quantity"], "price": product["price"]} for product in products]
    return listings

# API Endpoint
@app.route('/predict', methods=['POST'])
def chatbot():
    """Handles user messages and processes queries."""
    data = request.json
    user_message = data.get("message", "")
    farmer_id = data.get("userId", "")

    if not farmer_id:
        return jsonify({"error": "❌ Unauthorized. Farmer ID missing."}), 401

    response = chat_bot(user_message, data.get("user_type", "customer"), farmer_id)
    return jsonify({"response": response})

# Run Flask
if __name__ == "__main__":
    print("🚀 Running Flask Locally on port 8080...")
    app.run(host="0.0.0.0", port=8080, debug=True)