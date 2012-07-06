#!/usr/bin/env bash

## 
# using https://github.com/jsdoc3/jsdoc
#
# git clone git://github.com/jsdoc3/jsdoc.git /usr/local/jsdoc3
# ln -s ./jsdoc-template /usr/local/jsdoc3/templates/bcc
#

output_dir="./docs"

rm -rf ${output_dir}

current_dir=`pwd -P`
template_path="${current_dir}/jsdoc-template"
source="src/bcc_*"

jsd_home="/usr/local/jsdoc3"
${jsd_home}/jsdoc ${source} -t "${template_path}" -d "${output_dir}"

pushd ${output_dir}
for f in *.html; do mv ${f%html}{html,php}; done
popd

#open "${output_dir}/index.html"

#scp -r ${output_dir}/* root@dev04:/var/www/html/wp/docs/js/
