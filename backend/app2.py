from flask import Flask, request, jsonify
from flask_cors import CORS
import httpx
import time
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
                    {"role": "system", "content": "Extract intent and product details in pure JSON format. Include farmerId for tracking. Ensure all product names are in lowercase. Do NOT use markdown, only return JSON like:\n\n{\"intent\": \"AddProduct\", \"productDetails\": {\"product\": \"tomato\", \"quantity\": 300, \"price\": 70, \"farmerId\": \"farmer_123\"}}"},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=512,
                top_p=1,
                stream=False
            )

            groq_response = completion.choices[0].message.content.strip()
            print(f"🔍 Groq Raw Response: {groq_response}")

            # ✅ Ensure the response is valid JSON
            groq_response = groq_response.strip("```json").strip("```").strip()

            try:
                intent_data = json.loads(groq_response)  # Convert to JSON
                
                # ✅ Convert product name to lowercase before returning
                if "productDetails" in intent_data:
                    intent_data["productDetails"]["product"] = intent_data["productDetails"].get("product", "").lower()

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



# ✅ Save Product to MongoDB (in lowercase)
# ✅ Save Product to MongoDB (with farmer ID)
def save_product_to_db(intent_data, farmer_id):
    """Saves product details to MongoDB if intent is AddProduct."""

    if intent_data["intent"] == "AddProduct":
        product_data = intent_data["entities"]
        
        if product_data and "product" in product_data:
            product_name = product_data["product"].lower()  # ✅ Store in lowercase
            price = product_data.get("price", 0)
            quantity = product_data.get("quantity", 0)

            # ✅ Check if product already exists for this farmer
            existing_product = products_collection.find_one({"product": product_name, "farmerId": farmer_id})

            if existing_product:
                # ✅ Update existing product
                update_query = {"product": product_name, "farmerId": farmer_id}
                update_data = {"$set": {"price": price, "quantity": quantity}}
                products_collection.update_one(update_query, update_data)
                print(f"🔄 Updated Product in MongoDB: {update_query} → {update_data}")
            else:
                # ✅ Insert new product
                product_data["farmerId"] = farmer_id  # ✅ Include farmer ID
                product_data["product"] = product_name  # ✅ Ensure lowercase
                products_collection.insert_one(product_data)
                print(f"✅ Product saved to MongoDB: {product_data}")
        else:
            print("⚠️ No valid product details to save.")


# ✅ Update Product in MongoDB
def update_product_in_db(intent_data, farmer_id):
    """Updates product details in MongoDB if intent is UpdateProduct."""
    
    if intent_data["intent"] == "UpdateProduct":
        product_data = intent_data["entities"]
        product_name = product_data.get("product")
        new_price = product_data.get("price")

        if not product_name:
            return {"status": "❌ Failed", "message": "Product name is missing for update."}

        # ✅ Convert product name to lowercase
        product_name = product_name.lower()

        # ✅ Ensure we filter by both product name and farmer ID
        query = {"product": product_name, "farmerId": farmer_id}
        update_data = {"$set": {}}

        if new_price:
            update_data["$set"]["price"] = new_price  # Update price if provided

        print(f"🔄 Updating product with query: {query}, data: {update_data}")
        result = products_collection.update_one(query, update_data)

        if result.matched_count:
            return {"status": "✅ Success", "message": f"Updated '{product_name}' price to ₹{new_price}/kg."}
        else:
            return {"status": "❌ Not Found", "message": f"'{product_name}' not found in database for farmer {farmer_id}."}

# ✅ Check Product Availability (Case-Insensitive)
def check_product_availability(product_name, farmer_id, price=None, quantity=None):
    """Checks if the requested product is available for the given farmer."""
    
    if not product_name:
        return {"available": False, "message": "❌ Could not determine the product name. Please try again."}

    product_name = product_name.lower()  # ✅ Convert to lowercase for case-insensitive search

    # ✅ Ensure we filter by both product name and farmer ID
    query = {
        "product": {"$regex": f"^{product_name}$", "$options": "i"},  # Case-insensitive search
        "farmerId": farmer_id  # Match the farmer's ID
    }

    if price:
        query["price"] = {"$lte": price}  # Ensure price is within range
    if quantity:
        query["quantity"] = {"$gte": quantity}  # Ensure enough stock

    print(f"🔍 Checking availability with query: {query}")
    product = products_collection.find_one(query)

    if product:
        return {
            "available": True,
            "name": product.get("product", ""),
            "price": product.get("price", ""),
            "quantity": product.get("quantity", ""),
            "farmerId": product.get("farmerId", ""),
            "message": f"✅ '{product_name}' is available under farmer {farmer_id}: {product.get('quantity')} kg at ₹{product.get('price')}/kg."
        }
    else:
        return {"available": False, "message": f"❌ '{product_name}' not found in database for farmer {farmer_id}."}


# ✅ Process User Query
def chat_bot(message, user_type, farmer_id):
    """Processes user query using Groq API, extracts intent, and checks product availability."""
    language = detect(message) if message else "en"
    intent_data = query_groq(message)
    extracted_entities = intent_data["entities"]
    product_name = extracted_entities.get("product")
    price = extracted_entities.get("price")
    quantity = extracted_entities.get("quantity")

    # ✅ If adding a product, pass `farmerId`
    if intent_data["intent"] == "AddProduct":
        save_product_to_db(intent_data, farmer_id)
        return f"✅ Product '{product_name}' added successfully for farmer {farmer_id}."

    # ✅ If checking product availability
    if intent_data["intent"] == "CheckAvailability":
        availability = check_product_availability(product_name, farmer_id, price, quantity)
        return availability["message"]

    # ✅ If updating a product
    if intent_data["intent"] == "UpdateProduct":
        if not product_name or price is None:
            return "❌ Invalid update request. Missing product or price."
        return update_product_in_db(intent_data, farmer_id)

    # ✅ Load conversation memory
    memory_context = memory.load_memory_variables(inputs={"user_query": message})
    prompt = prompt_template.format(
        user_type=user_type,
        history=memory_context.get('history', ''),
        user_query=message,
        language=language
    )

    # ✅ Query Groq AI Model
    try:
        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": message}],
            temperature=0.7,
            max_tokens=1024,
            top_p=1,
            stream=False,
        )
        return completion.choices[0].message.content
    except httpx.RequestError:
        return "Unable to process request at this time. Please try again later."

# ✅ API Endpoint for Chatbot
@app.route('/predict', methods=['POST'])
def chatbot():
    data = request.json
    user_message = data.get("message", "")
    user_type = data.get("user_type", "customer")
    farmer_id = data.get("farmerId", None)  # ✅ Fetch farmer ID

    if not user_message:
        return jsonify({"error": "❌ Message cannot be empty."}), 400
    if not farmer_id:
        return jsonify({"error": "❌ Farmer ID is required."}), 400  # ✅ Ensure farmer ID is included

    response = chat_bot(user_message, user_type, farmer_id)
    return jsonify({"response": response})


# ✅ Health Check API
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "✅ healthy"})

# ✅ Run Flask Locally
if __name__ == "__main__":
    print("🚀 Running Flask Locally on port 8080...")
    app.run(host="0.0.0.0", port=8080, debug=True)
