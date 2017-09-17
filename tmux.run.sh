function shutdown () {
    if [[ ! -z "$olio" ]]; then
        kill "$olio"
    fi
}

# trap shutdown INT

rm ./socket

node olio.bin.js ./socket listen &
olio=$!

echo $!

while [[ ! -e ./socket ]]; do
    true
done

node olio.bin.js ./socket run --workers 1 ./bin/echo.bin.js

node olio.bin.js ./socket serve --workers 1 ./bin/http.bin.js

wait $!
