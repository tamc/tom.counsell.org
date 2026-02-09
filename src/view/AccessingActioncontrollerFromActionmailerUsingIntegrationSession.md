---
title: "Accessing ActionController from ActionMailer using Integration::Session"
css:
  - /index.css
---

Up until Rails 1.1 there was no easy way to include output from ActionControllers in a mail message created with ActionMailer. Now you can use code like this in your mail view templates:

 ` ``` <%   session = ActionController::Integration::Session.new %>  <%   session.host! 'www.mysite.com' %>  <%  session.get session.url_for(:controller => 'view', :action => 'somthing' ) %>  <%=   session.response.body %> ``` `
