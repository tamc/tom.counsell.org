---
title: "A rake task to set the file permissions and ownership in a rails project"
css:
  - /index.css
---

[Darcs](Darcs.html) doesn’t mange file permissions or ownership. To make it easy to setup file permissions after a `darcs get` of a [rails](Rails.html) project I create a setup.rake file in lib/tasks with the following:

  `` ``` desc 'Set permissions on fast and cgi scripts'   task :set_permissions do     # Execute privelages     ['public','public/dispatch.cgi','public/dispatch.fcgi','public/dispatch.rb','script/*','script/process/*'].each do |file|       p `chmod a+x #{File.dirname(__FILE__) + '/../../' + file }`     end     # Write privelages     ['tmp','log','index','public/list','public/talk','public/user'].each do |file|       p `chmod -R a+rw #{File.dirname(__FILE__) + '/../../' + file }`     end ``` ``

After a `darcs get` I can then just run `rake set_permissions` and be ready to run.
