
olio --socket ./socket listen "$(
    olio run --children 3 node responder.bin.js --port 8080
)"
local olio=$?

olio --socket ./socket run --name run --children 3 node responder.bin.js --port 8080
olio --socket ./socket serve --name http --children 3 node server.bin.js --port 8080

wait $olio
