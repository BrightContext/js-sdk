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

jsdoc ${source} -t "${template_path}" -d "${output_dir}"

pushd ${output_dir}
for f in *.html; do mv ${f%html}{html,php}; done
popd
