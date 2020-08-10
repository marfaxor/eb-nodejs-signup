#!/bin/bash

rm bdproto.zip
cd eb-node
zip bdproto.zip -r * .[^.]*
mv bdproto.zip ../bdproto.zip
cd ../
