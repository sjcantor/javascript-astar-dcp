#!/bin/bash

# Clear file
echo > publishedFile.js

# Add code with bravojs stuff
sed -i '1s/^/module.declare([], function(require, exports, modules) {\n/' publishedFile.js
echo "$(cat astar-dcp-package.js)" >> publishedFile.js
echo '});' >> publishedFile.js

# Publish
eval /home/cantor/git/dcp-util/bin/publish package /home/cantor/git/javascript-astar-dcp/package.dcp --dcp-scheduler=https://scheduler.distributed.computer