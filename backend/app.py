from flask import Flask, request, jsonify
from flask_cors import CORS
import httpx
import time
import re
import json
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langdetect import detect
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

# ✅ Function to Query Groq AI
def query_groq(message):
    """Sends user message to Groq AI and ensures valid JSON response."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            completion = client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {"role": "system", "content": "Extract intent and product details in pure JSON format. Do NOT use markdown, only return JSON like:\n\n{\"intent\": \"AddProduct\", \"productDetails\": {\"product\": \"Tomato\", \"quantity\": 300, \"price\": 70}}"},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=512,
                top_p=1,
                stream=False
            )

            # Get raw response
            groq_response = completion.choices[0].message.content.strip()
            print(f"🔍 Groq Raw Response: {groq_response}")

            # ✅ Fix: Ensure the response is valid JSON (Remove unwanted text)
            groq_response = groq_response.strip("```json").strip("```").strip()

            # ✅ Try parsing JSON
            try:
                intent_data = json.loads(groq_response)  # Convert to JSON
                return {
                    "intent": intent_data.get("intent", "unknown"),
                    "entities": intent_data.get("productDetails", {}),
                }
            except json.JSONDecodeError as e:
                print(f"❌ JSON Parse Error: {e}")
                return {"intent": "unknown", "entities": {}}

        except httpx.RequestError:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
                continue
            return {"intent": "error", "entities": {}}


# ✅ Extract Entities from User Query
def extract_entities(message):
    """Extracts product-related details like product name, quantity, and price."""
    quantity_match = re.search(r"(\d+)\s?kg", message)
    price_match = re.search(r"(\d+)/kg", message)

    # ✅ Instead of hardcoding product names, extract words after "product", "buy", or similar keywords
    product_match = re.search(r"(?:product|buy|sell|availability of|order)\s+([\w\s]+)", message, re.IGNORECASE)

    extracted = {
        "quantity": int(quantity_match.group(1)) if quantity_match else None,
        "price": int(price_match.group(1)) if price_match else None,
        "product": product_match.group(1).strip().lower() if product_match else None
    }

    print(f"🔎 Extracted Entities: {extracted}")  # ✅ Debugging

    return extracted


# ✅ Save Product to MongoDB
def save_product_to_db(intent_data):
    """Saves product details to MongoDB if intent is AddProduct."""
    if intent_data["intent"] == "AddProduct":
        product_data = intent_data["entities"]
        if product_data and "product" in product_data:
            products_collection.insert_one(product_data)
            print(f"✅ Product saved to MongoDB: {product_data}")
        else:
            print("⚠️ No valid product details to save.")

def chat_bot(message, user_type):
    """Processes user query using Groq API, extracts intent, and checks product availability."""

    language = detect(message) if message else "en"

    # ✅ Extract Entities from User Query
    extracted_entities = extract_entities(message)
    product_name = extracted_entities.get("product")
    price = extracted_entities.get("price")
    quantity = extracted_entities.get("quantity")

    # ✅ Check MongoDB for Product Availability
    availability = check_product_availability(product_name, price, quantity)

    # ✅ If no product is found, return an appropriate response
    if not availability["available"]:
        return availability["message"]

    # ✅ If the product EXISTS, generate response using AI
    memory_context = memory.load_memory_variables(inputs={"user_query": message})

    prompt = prompt_template.format(
        user_type=user_type,
        history=memory_context.get('history', ''),
        user_query=message,
        language=language
    )

    # ✅ Query Groq AI Model
    result = ''
    max_retries = 3
    for attempt in range(max_retries):
        try:
            completion = client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=1024,
                top_p=1,
                stream=False,
            )
            result = completion.choices[0].message.content
            break
        except httpx.RequestError:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
                continue
            return "Unable to process request at this time. Please try again later."

    # ✅ Store conversation history
    if result.strip():
        memory.save_context({"user_query": message}, {"response": result.strip()})

    return result.strip()




def check_product_availability(product_name, price=None, quantity=None):
    """Checks if the requested product is available in the database."""
    
    # ✅ If product_name is None, return "not available"
    if not product_name:
        return {"available": False, "message": "❌ Could not determine the product name. Please try again."}

    # ✅ Build MongoDB Query Dynamically
    query = {"name": product_name}

    if price:
        query["price"] = {"$lte": price}  # Ensure price is within the user's range

    if quantity:
        query["quantity"] = {"$gte": quantity}  # Ensure there is enough stock

    print(f"🔍 Checking availability with query: {query}")

    # ✅ Search in MongoDB
    product = products_collection.find_one(query)

    if product:
        return {
            "available": True,
            "name": product.get("name", ""),
            "price": product.get("price", ""),
            "quantity": product.get("quantity", ""),
        }
    else:
        return {"available": False, "message": f"❌ Sorry, '{product_name}' is not available in our database."}



# ✅ API Endpoint for Chatbot
@app.route('/predict', methods=['POST'])
def chatbot():
    """Handles user messages and processes intent recognition via Groq AI."""
    data = request.json
    user_message = data.get("message", "")
    user_type = data.get("user_type", "customer")  # Default to customer if not specified

    if not user_message:
        return jsonify({"error": "❌ Message cannot be empty."}), 400

    # ✅ Process Query & Extract Intent
    response = chat_bot(user_message, user_type)
    extracted_entities = extract_entities(user_message)

    # ✅ Save to MongoDB if Intent is AddProduct
    intent_data = query_groq(user_message)
    save_product_to_db(intent_data)

    return jsonify({
        "response": response,
        "extracted_entities": extracted_entities,
        "intent": intent_data["intent"],
    })

# ✅ Health Check API
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "✅ healthy"})

# ✅ Run Flask Locally
if __name__ == "__main__":
    print("🚀 Running Flask Locally on port 8080...")
    app.run(host="0.0.0.0", port=8080, debug=True)
