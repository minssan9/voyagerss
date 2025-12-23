import os

root_dir = r"f:\repository\voyagerss\backend\src\modules"

def replace_imports(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Specific replacements FIRST
    # These match what we did for investand.
    content = content.replace("@/routes", "@investand/controllers")
    content = content.replace("@/scripts", "@investand/batch")
    content = content.replace("@/types", "@investand/interfaces")
    
    # General replacement
    content = content.replace("@/", "@investand/")
    
    if content != original_content:
        print(f"Updating {file_path}")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

for subdir, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            replace_imports(os.path.join(subdir, file))
