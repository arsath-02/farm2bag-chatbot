from flask import Flask, request, jsonify
from flask_cors import CORS
import httpx
import json
import re
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from groq import Groq
from pymongo import MongoClient,ReturnDocument
from datetime import datetime
from bson import ObjectId

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
MONGO_URI = "mongodb+srv://arsath02062004:1230@user.xnp6k.mongodb.net/test?retryWrites=true&w=majority&appName=user"
client_mongo = MongoClient(MONGO_URI)
db = client_mongo["test"]
products_collection = db["products"]
orders_collection = db["orders"]

print("✅ Connected to Local MongoDB!")

# Initialize LangChain Memory
memory = ConversationBufferMemory(return_messages=True)

# Define Prompt Template
prompt_template = PromptTemplate(
    input_variables=["user_type", "history", "user_query", "language"],
    template="""
    You are an AI assistant helping {user_type} with agricultural product management.
    Your role is to assist with various tasks and provide accurate and structured responses based on the given intents.

    **User Type**: {user_type}
    **Conversation History**: {history}
    **User Query**: {user_query}
    **Language**: {language}

    **Intents**:
    - add_product
    - check_availability
    - update_product
    - show_me
    - view_listings
    - search_product
    - compare_prices
    - place_order

    Please respond accurately in the same language as the user query, ensuring your response matches one of the provided intents.

    **For Farmers**:
    - Assist with **adding, updating, or removing products**.
    - Confirm **product name, quantity, and price** before saving.
    - Offer **market price trends and seasonal insights**.
    - Ensure clarity and accuracy in responses.

    **For Customers**:
    - Assist with **placing orders**.
    - Confirm **product availability, quantity, and price**.
    - Suggest alternatives if a product is out of stock.
    - Ensure clarity and accuracy in responses.

    Keep the conversation dynamic by adapting to the user's needs and queries while maintaining a friendly and professional tone. Provide relevant information and solutions based on the user's context and preferences.

    Remember to:
    - Use structured and well-organized responses.
    - Be engaging and conversational.
    - Adapt to any changes in user intent dynamically within the specified intents.
    - Stay focused on the task at hand and ensure user satisfaction.
    - It is very important that All the intents should be in the above given format
    - i need or i want intents are come under search_product
    """
)


# Query Groq AI
def query_groq(message, user_type, farmer_id):
    """Sends user message to Groq AI and extracts valid JSON response."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            completion = client.chat.completions.create(
                model="mixtral-8x7b-32768",
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

            # Extract JSON block using a safer approach
            json_match = re.search(r'\{[\s\S]*\}', groq_response)  # Matches JSON enclosed in {}
            if json_match:
                json_str = json_match.group(0)  # Extract the matched JSON
                intent_data = json.loads(json_str)
            else:
                print("❌ No valid JSON found in response.")
                return {"intent": "error", "entities": {}}

            # Standardize response format
            response = {
                "intent": intent_data.get("intent", "unknown"),
                "entities": {
                    "filters": intent_data.get("filters", {}),
                    "products": intent_data.get("products", []) or intent_data.get("product_details", []) or intent_data.get("product", {})
                }
            }

            # Ensure product names are lowercase
            if isinstance(response["entities"].get("products"), list):
                for product in response["entities"]["products"]:
                    if isinstance(product, dict) and "name" in product:
                        product["name"] = product["name"].lower()

            return response
        
        except (httpx.RequestError, json.JSONDecodeError) as e:
            print(f"❌ Error querying Groq: {e}")
            return {"intent": "error", "entities": {}, "error_message": str(e)}

    return {"intent": "error", "entities": {}, "error_message": "Max retries exceeded"}

# Process User Query
def chat_bot(message, user_type, farmer_id):
    """Processes user query, extracts intent, and returns product details."""
    intent_data = query_groq(message, user_type, farmer_id)
    extracted_entities = intent_data["entities"]

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
    if intent_data["intent"] == "show_me":
        return show_vegetables(extracted_entities)
    if intent_data["intent"] == "search_product":
        return search_products(extracted_entities.get("filters", {}).get("product_name", ""))
    if intent_data["intent"] == "compare_prices":
        return compare_prices(extracted_entities.get("product_name", ""))
    if intent_data["intent"] == "place_order":
        return order_place(farmer_id, extracted_entities.get("products", {}).get("name", ""), extracted_entities.get("products", {}).get("quantity", 0))

    return {"intent": "unknown", "entities": {}}

# Show Vegetables
def show_vegetables(entities):
    """Returns the vegetables that match the specified criteria."""
    max_price = entities.get("filters", {}).get("price", {}).get("max", None)
    if max_price is not None:
        products = products_collection.find({"price": {"$lte": max_price}})
    else:
        products = products_collection.find()

    product_list = [{"name": product["name"], "price": product["price"]} for product in products]
    return {"intent": "show vegetables under ₹50 per kg", "entities": product_list}


from datetime import datetime
from bson import ObjectId

def extract_numeric_quantity(quantity):
    """Extracts numeric value from a quantity string like '1kg'."""
    match = re.search(r'\d+', str(quantity))  # Ensure quantity is a string
    return int(match.group()) if match else None

def order_place(user_id, product_name, quantity):
    """Places an order for a product after checking availability."""

    product_name = product_name.lower()
    numeric_quantity = extract_numeric_quantity(quantity)

    # Atomically find and update product stock
    product = products_collection.find_one_and_update(
        {"name": product_name, "quantity": {"$gte": numeric_quantity}},  
        {"$inc": {"quantity": -numeric_quantity}},  
        return_document=True  
    )

    if product:
        total_price = product["price"] * numeric_quantity  # Calculate total price

        order = {
            "_id": ObjectId(),
            "user_id": ObjectId(user_id),
            "product_name": product_name,
            "quantity": numeric_quantity,
            "price_per_kg": product["price"],
            "total_price": total_price,
            "status": "Confirmed",
            "createdAt": datetime.utcnow()
        }
        
        db["orders"].insert_one(order)  # Insert order into the database

        return {
            "intent": "order_place",
            "message": f"✅ Order placed: {numeric_quantity} kg of {product_name} at ₹{product['price']}/kg. Total: ₹{total_price}.",
            "order_id": str(order["_id"])
        }
    
    return {
        "intent": "order_place",
        "message": f"❌ '{product_name}' is out of stock or insufficient quantity available."
    }

def compare_prices(product_name):
    """Fetches and compares prices of a product from different sellers."""
    product_name = product_name.lower()
    
    # Fetch products from MongoDB
    products = list(products_collection.find({"name": product_name}))

    # Extract price details
    price_list = [
        {
            "farmer_id": product.get("farmerId"),
            "price": product.get("price"),
            "quantity": product.get("quantity")
        }
        for product in products
    ]

    return {
        "intent": "compare_prices",
        "results": price_list if price_list else []
    }


def search_products(query):
    """Searches for products matching the given query."""
    search_query = {"name": {"$regex": query, "$options": "i"}}  # Case-insensitive search
    products = products_collection.find(search_query)

    product_list = [{"name": product["name"], "price": product["price"], "quantity": product["quantity"]} for product in products]

    return {"intent": "search_products", "results": product_list if product_list else "❌ No products found matching the query."}

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
