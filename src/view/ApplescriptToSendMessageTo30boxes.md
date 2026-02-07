---
title: "Applescript to send message to 30boxes"
css:
  - /index.css
---

I find the ability to forward messages to [www.30boxes.com](http://www.30boxes.com) and have them added to my calendar extremely useful.

I created an applescript to slightly automate the process:

```
tell application "Mail" 
    set theMessages to the selection
    repeat with thisMessage in theMessages
        display dialog "30 Boxes subject:" default answer (thisMessage's subject as string)
        set theSubject to text returned of result
        set newMessage to make new outgoing message
        tell newMessage
            set subject to theSubject
            set content to thisMessage's content
            make new to recipient with properties {address:"add@30boxes.com"}
        end tell
        send newMessage
        delete newMessage
    end repeat
end tell
```
