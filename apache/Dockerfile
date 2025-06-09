FROM httpd:2.4

# Enable required modules
RUN sed -i \
    -e 's/^#\(LoadModule proxy_module\)/\1/' \
    -e 's/^#\(LoadModule proxy_http_module\)/\1/' \
    -e 's/^#\(LoadModule proxy_wstunnel_module\)/\1/' \
    /usr/local/apache2/conf/httpd.conf

# Copy dashboard build
COPY dashboard/dist/ /usr/local/apache2/htdocs/

# Configure proxy for /api and /ws
RUN echo "\n\
ProxyPass /api http://api:4000/api retry=0\n\
ProxyPassReverse /api http://api:4000/api\n\
ProxyPass /ws ws://api:4000/ws\n\
ProxyPassReverse /ws ws://api:4000/ws\n" \
>> /usr/local/apache2/conf/httpd.conf 