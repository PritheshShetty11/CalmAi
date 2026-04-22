import re

def extract_location(text):
    text_lower = text.lower()

    # First try to find "room" followed by number
    match1 = re.search(r"room\s*(\d+)", text_lower)
    if match1:
        return f"room {match1.group(1)}"

    # Handle date formats like "1/03", "2/15" etc. - combine digits to form room number
    match_date = re.search(r"(\d+)[/]\s*(\d{2,3})", text_lower)
    if match_date:
        first_part = match_date.group(1)
        second_part = match_date.group(2)
        # Combine the parts: "1" + "03" = "103"
        combined_number = first_part + second_part
        return f"room {combined_number}"
    
    # Then try to find standalone 3-4 digit numbers (more specific)
    match2 = re.search(r"\b(\d{3,4})\b", text_lower)
    if match2:
        return f"room {match2.group(1)}"
    
    # Finally try 2-digit numbers
    match3 = re.search(r"\b(\d{2})\b", text_lower)
    if match3:
        return f"room {match3.group(1)}"

    return "Unknown"

# Test cases focusing on the specific issue
test_cases = [
    "Fire in 1/03",
    "fire in 2/15", 
    "emergency in 12/05",
    "help in 3/02",
    "medical emergency in 10/25",
    "fire in 302"  # Should still work
]

print("Testing combined location extraction:")
for test in test_cases:
    result = extract_location(test)
    print(f"'{test}' -> '{result}'")
