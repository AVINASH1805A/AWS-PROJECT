#!/usr/bin/env python3
import os
import re
import subprocess
import sys

md_path = "/Users/avinashagarwal/.gemini/antigravity/scratch/branchflow-app/PROJECT_REPORT.md"
html_path = "/Users/avinashagarwal/.gemini/antigravity/scratch/branchflow-app/PROJECT_REPORT.html"
pdf_path = "/Users/avinashagarwal/.gemini/antigravity/scratch/branchflow-app/PROJECT_REPORT.pdf"
user_data_dir = "/Users/avinashagarwal/.gemini/antigravity/scratch/branchflow-app/.chrome_user_data"

with open(md_path, "r", encoding="utf-8") as f:
    md_content = f.read()

def md_to_html(md_text):
    html = md_text

    # Code blocks
    html = re.sub(r'```(.*?)```', lambda m: f'<pre><code>{m.group(1).strip()}</code></pre>', html, flags=re.DOTALL)
    
    # Headers
    html = re.sub(r'^# (.*?)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.*?)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.*?)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    
    # Bold & Italic
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)
    
    # Inline Code
    html = re.sub(r'`(.*?)`', r'<code>\1</code>', html)

    # Horizontal rule
    html = re.sub(r'^---$', r'<hr>', html, flags=re.MULTILINE)
    
    # Tables simple parser
    lines = html.split('\n')
    new_lines = []
    in_table = False
    table_rows = []

    for line in lines:
        if line.strip().startswith('|') and line.strip().endswith('|'):
            if '---' in line:
                continue
            cols = [c.strip() for c in line.strip('|').split('|')]
            if not in_table:
                in_table = True
                table_rows.append('<thead><tr>' + ''.join(f'<th>{c}</th>' for c in cols) + '</tr></thead><tbody>')
            else:
                table_rows.append('<tr>' + ''.join(f'<td>{c}</td>' for c in cols) + '</tr>')
        else:
            if in_table:
                in_table = False
                table_rows.append('</tbody></table>')
                new_lines.append('<table class="styled-table">' + ''.join(table_rows))
                table_rows = []
            new_lines.append(line)
    if in_table:
        table_rows.append('</tbody></table>')
        new_lines.append('<table class="styled-table">' + ''.join(table_rows))

    html = '\n'.join(new_lines)
    
    # Paragraphs & lists
    paragraphs = html.split('\n\n')
    formatted = []
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        if p.startswith('<h') or p.startswith('<table') or p.startswith('<pre') or p.startswith('<hr'):
            formatted.append(p)
        elif p.startswith('* ') or p.startswith('- '):
            items = [f'<li>{item.strip()[2:]}</li>' for item in p.split('\n') if item.strip().startswith('* ') or item.strip().startswith('- ')]
            formatted.append('<ul>' + ''.join(items) + '</ul>')
        elif p.startswith('1. ') or p.startswith('2. '):
            items = [f'<li>{re.sub(r"^\d+\.\s*", "", item.strip())}</li>' for item in p.split('\n') if re.match(r"^\d+\.", item.strip())]
            formatted.append('<ol>' + ''.join(items) + '</ol>')
        else:
            formatted.append(f'<p>{p}</p>')
            
    return '\n'.join(formatted)

body_html = md_to_html(md_content)

full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>BranchFlow Project Technical Report</title>
    <style>
        @page {{
            size: A4;
            margin: 15mm;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            background: #ffffff;
            line-height: 1.6;
            padding: 20px;
            font-size: 13px;
        }}
        h1 {{
            color: #1e3a8a;
            font-size: 22px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 8px;
            margin-top: 0;
        }}
        h2 {{
            color: #1e40af;
            font-size: 16px;
            margin-top: 20px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
        }}
        h3 {{
            color: #1d4ed8;
            font-size: 14px;
            margin-top: 14px;
        }}
        p {{
            margin: 8px 0;
        }}
        code {{
            background-color: #f3f4f6;
            color: #b91c1c;
            padding: 2px 5px;
            border-radius: 4px;
            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 11px;
        }}
        pre {{
            background-color: #0f172a;
            color: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 10.5px;
            line-height: 1.4;
        }}
        pre code {{
            background: none;
            color: inherit;
            padding: 0;
        }}
        table.styled-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 11.5px;
        }}
        table.styled-table th, table.styled-table td {{
            border: 1px solid #d1d5db;
            padding: 6px 10px;
            text-align: left;
        }}
        table.styled-table th {{
            background-color: #f3f4f6;
            color: #111827;
            font-weight: 600;
        }}
        table.styled-table tr:nth-child(even) {{
            background-color: #f9fafb;
        }}
        ul, ol {{
            padding-left: 20px;
            margin: 8px 0;
        }}
        li {{
            margin-bottom: 3px;
        }}
        hr {{
            border: 0;
            height: 1px;
            background: #e5e7eb;
            margin: 16px 0;
        }}
    </style>
</head>
<body>
{body_html}
</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(full_html)

chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cmd = [
    chrome_path,
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    f"--user-data-dir={user_data_dir}",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_path}",
    html_path
]

res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode == 0 and os.path.exists(pdf_path):
    print(f"SUCCESS: Created PDF at {pdf_path}")
else:
    print(f"Chrome return code: {res.returncode}, stderr: {res.stderr}")
