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
    
    # Handle time formats like "6:02", "12:15" etc. - combine digits to form room number
    match_time = re.search(r"(\d+)[:]\s*(\d{2})", text_lower)
    if match_time:
        first_part = match_time.group(1)
        second_part = match_time.group(2)
        # Combine the parts: "6" + "02" = "602"
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

# Test cases focusing on time formats
test_cases = [
    "Medical Emergencies in 6:02",
    "fire in 12:15", 
    "emergency in 3:05",
    "help in 9:30",
    "medical emergency in 11:45",
    "fire in 302"  # Should still work
]

print("Testing time format location extraction:")
for test in test_cases:
    result = extract_location(test)
    print(f"'{test}' -> '{result}'")
