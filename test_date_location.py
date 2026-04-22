import re

def extract_location(text):
    text_lower = text.lower()

    # First try to find "room" followed by number
    match1 = re.search(r"room\s*(\d+)", text_lower)
    if match1:
        return f"room {match1.group(1)}"

    # Handle date formats like "1/03", "2/15" etc. - extract the last part as room number
    match_date = re.search(r"\d+[/]\s*(\d{2,3})", text_lower)
    if match_date:
        return f"room {match_date.group(1)}"
    
    # Then try to find standalone 3-4 digit numbers (more specific)
    match2 = re.search(r"\b(\d{3,4})\b", text_lower)
    if match2:
        return f"room {match2.group(1)}"
    
    # Finally try 2-digit numbers
    match3 = re.search(r"\b(\d{2})\b", text_lower)
    if match3:
        return f"room {match3.group(1)}"

    return "Unknown"

# Test cases focusing on date formats
test_cases = [
    "Fire in 1/03",
    "fire in 2/15", 
    "emergency in 12/05",
    "help in 3/02",
    "medical emergency in 10/25"
]

print("Testing date format location extraction:")
for test in test_cases:
    result = extract_location(test)
    print(f"'{test}' -> '{result}'")
