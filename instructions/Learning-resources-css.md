1. The Chapter Title (Create Anchor Points)
Current: font-size: 14px; font-weight: 500; color: #111;
Change To: font-size: 18px; font-weight: 700; color: #000; letter-spacing: -0.01em;
Why: A heavier, slightly larger title breaks the monotony and gives the eye a place to land.
2. The Status Indicators (The "Block" Pattern)
Instead of plain text Video: Ready • Slides: Missing, render them as flexbox chips.

Ready State: background-color: #F0FDF4; color: #16A34A; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500;
Missing State: background-color: #FEF2F2; color: #DC2626; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; (Or use a dashed border: border: 1px dashed #D1D5DB; color: #9CA3AF; background: transparent;)
Why: The brain processes colored blocks instantly. It turns a reading task into a visual scanning task.
3. Remove Hard Borders (The Whitespace Rule)
Current: border: 1px solid #E5E7EB; on the chapter wrapper and the expanded section.
Change To: Remove all borders. Add margin-bottom: 32px between chapters. When expanded, wrap the resources in a div with background-color: #F9FAFB; border-radius: 8px; padding: 16px;
Why: Hard lines make UI feel like a 2005 spreadsheet. Soft background colors and whitespace make it feel like a modern web app (like Notion).
4. Resource List Hierarchy (Inside the Expanded Area)
Current: Title and metadata look identical.
Change To:
Resource Title: font-size: 14px; font-weight: 500; color: #111827;
Metadata (e.g., "8 min • OKF Curated"): font-size: 12px; font-weight: 400; color: #9CA3AF; margin-top: 2px;
Why: Creating a stark contrast between the title and the metadata makes the list highly readable.
5. The Action Buttons (Focal Points)
Current: Likely standard outlined buttons or text links that blend in.
Change To: Make [Assign] a high-contrast solid button: background-color: #111827; color: white; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500;
Why: A dark, solid button provides a visual "payoff" or target for the user's eye after scanning the text.