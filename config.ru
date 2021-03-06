require 'bundler/setup'
require 'sinatra/base'

# The project root directory
$root = ::File.dirname(__FILE__)

class SinatraStaticServer < Sinatra::Base  

  get "/" do
    send_sinatra_file(request.path) {404}
  end

  get %r{/view/HomePage(.html)?} do
    redirect "/"
  end

  get %r{/view/Programming(.html)?} do
    redirect "/programming/"
  end

  get "*.html" do
    send_sinatra_file(request.path) {404}
  end

  get "/view/*" do
    redirect request.path + ".html"
  end

  not_found do
    send_sinatra_file('404.html') {"Sorry, I cannot find #{request.path}"}
  end

  def send_sinatra_file(path, &missing_file_block)
    file_path = File.join(File.dirname(__FILE__), 'public',  path)
    file_path = File.join(file_path, 'index.html') unless file_path =~ /\.[a-z]+$/i  
    File.exist?(file_path) ? send_file(file_path) : missing_file_block.call
  end

end

run SinatraStaticServer
