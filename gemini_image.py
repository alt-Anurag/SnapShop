import google.generativeai as genai
from flask import Flask, request, jsonify
import base64
import re
from io import BytesIO
from PIL import Image
from flask_cors import CORS  # Add at top

app = Flask(__name__)
CORS(app)  # Add this line right after

# Configure with your API key - REPLACE WITH YOUR ACTUAL API KEY
genai.configure(api_key="AIzaSyAkWLp68hygPw0vLO14O1YYcPzSN49EHco")

def describe_image(image_data):
    """Takes base64 image data and returns a description using Gemini 1.5 Flash"""
    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Prepare image
        img_bytes = base64.b64decode(image_data)
        img_part = {
            "mime_type": "image/jpeg", 
            "data": img_bytes
        }

        # Generate description
        response = model.generate_content(
            ["Describe this image in exactly one line at the top. And then using numbered bullet points, focus on products, clothes, objects and their colors, styles and distinct characteristics (if any) that would be relevant for shopping in the frame. The bullet points should be crisp and short. Use clear formatting. Use **bold** only for category labels (like **Clothes:**). Do not use markdown for anything else.", img_part]
        )
        return response.text
    
    except Exception as e:
        return f"Error: {str(e)}"

@app.route('/describe', methods=['POST'])
def handle_describe():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"error": "No image provided"}), 400
            
        description = describe_image(data['image'])
        return jsonify({"description": description})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)