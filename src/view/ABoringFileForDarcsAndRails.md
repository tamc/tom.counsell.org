---
title: "A boring file for darcs and rails"
css:
  - /index.css
---

[Rails](Rails.html) has a fair number of files that it isn’t useful to include under version control. To manage this with [darcs](Darcs.html) I create a file called boring with the content below, and then issue `darcs setpref boringfile boring`.

You can then use `darcs add -r *` to add everything else to [darcs](Darcs.html), and everytime you add new files.

` ``` # Boring file regexps: \.hi$ \.o$ \.o\.cmd$ # *.ko files aren't boring by default because they might # be Korean translations rather than kernel modules. # \.ko$ \.ko\.cmd$ \.mod\.c$ (^|/)\.tmp_versions($|/) (^|/)CVS($|/) (^|/)RCS($|/) ~$ #(^|/)\.[^/] (^|/)_darcs($|/) \.bak$ \.BAK$ \.orig$ (^|/)vssver\.scc$ \.swp$ (^|/)MT($|/) (^|/)\{arch\}($|/) (^|/).arch-ids($|/) (^|/), \.class$ \.prof$ (^|/)\.DS_Store$ (^|/)BitKeeper($|/) (^|/)ChangeSet($|/) (^|/)\.svn($|/) \.py[co]$ \# \.cvsignore$ (^|/)Thumbs\.db$ ^tmp/ \.sqlite3$ \.log$ db/schema\.rb config/lighttpd\.conf ^config/database.yml # You may wish to remove this one! ^test/tmp ^test/tmp/* ^index/* # Only relevant if you have acts as ferret ``` `
