rm ./logger ./socket

olio ./logger prolific stdout prolific.tcp --bind 8514 &
wait=$!

olio ./logger watch ./socket &

prolific --sibling tcp://8514 olio ./socket route --workers 8 &
olio=$1

olio ./socket monitor prolific --bind

olio ./socket tcp --bind 8443 --listeners 8 application tcp &

olio ./socket http --bind 8443 --listeners 8 application http &

wait $wait
