set -e

rm -f ./socket

 node node_modules/.bin/prolific stdio syslog --serializer wafer -- \
node olio.bin.js ./socket listen \
    "$(node olio.bin.js ./socket run --workers 3 ./bin/echo.bin.js)" \
    "$(node olio.bin.js ./socket serve --workers 1 ./bin/http.bin.js)"
