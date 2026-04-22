import re

def extract_location(text):
    text_lower = text.lower()

    # First try to find "room" followed by number
    match1 = re.search(r"room\s*(\d+)", text_lower)
    if match1:
        return f"room {match1.group(1)}"

    # Then try to find standalone 3-4 digit numbers (more specific)
    match2 = re.search(r"\b(\d{3,4})\b", text_lower)
    if match2:
        return f"room {match2.group(1)}"
    
    # Finally try 2-digit numbers
    match3 = re.search(r"\b(\d{2})\b", text_lower)
    if match3:
        return f"room {match3.group(1)}"

    return "Unknown"

# Test cases
test_cases = [
    "fire in 302",
    "fire in room 302", 
    "medical emergency in 205",
    "help in 101",
    "security issue in 3/02",
    "emergency in 404"
]

print("Testing location extraction:")
for test in test_cases:
    result = extract_location(test)
    print(f"'{test}' -> '{result}'")
