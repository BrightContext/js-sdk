/*global module:false*/
module.exports = function(grunt) {

  var config = require("./package.json");
  var bcc_ipaddr = process.env.bcc_ipaddr;

  //console.log(process.env);
  var defaultTask = [];
  defaultTask.push('jshint');
  defaultTask.push('concat');
  defaultTask.push('exec:' + ((process.env.bcc_env) ? 'env_' + process.env.bcc_env : 'env_prod'));
  defaultTask.push('exec:remove_backup_files');
  defaultTask.push('uglify:nomangle');

  // Project configuration
  // -------------------------------------------------- //

  grunt.initConfig({
    meta: {
      name: config.name,
      version: config.version,
      organization: config.organization,
      website: config.homepage
    },

    jshint: {
      "options": {
        "evil": true,
        "eqeqeq": false,
        "eqnull": true,
        "browser": true,
        "node": true,
        "devel": true,
        "strict": false
      },
      all: ['Gruntfile.js', 'src/bcc_*.js', 'tests/spec/*.js']
    },

    concat: {
      scripts: {
        src: ['src/bcc_*.js'],
        dest: 'build/bcc.js'
      }
    },

    exec: {
      env_local: {
        command: "sed -i'.bak' -e 's/\\$buildversionnumber\\$/" + config.version + "/g;s/\\$jsbaseURL\\$/http:\\/\\/localhost:9092\\//g;s/\\$jsbaseStaticURL\\$/http:\\/\\/static.bcclabs.com\\/pub\\/js\\/sdk/g' -e 's/\\$jsbaseSecureURL\\$/http:\\/\\/localhost:9092\\//g' -e 's/\\$jsbaseStaticSecureURL\\$/https:\\/\\/s3.amazonaws.com\\/static.bcclabs.com\\/pub\\/js\\/sdk/g' build/bcc.js"
      },
      env_ipaddr: {
        command: "sed -i'.bak' -e 's/\\$buildversionnumber\\$/" + config.version + "/g;s/\\$jsbaseURL\\$/http:\\/\\/" + bcc_ipaddr + ":9092\\//g;s/\\$jsbaseStaticURL\\$/http:\\/\\/static.bcclabs.com\\/pub\\/js\\/sdk/g' -e 's/\\$jsbaseSecureURL\\$/http:\\/\\/" + bcc_ipaddr + ":9092\\//g' -e 's/\\$jsbaseStaticSecureURL\\$/https:\\/\\/s3.amazonaws.com\\/static.bcclabs.com\\/pub\\/js\\/sdk/g' build/bcc.js"
      },
      env_test: {
        command: "sed -i'.bak' -e 's/\\$buildversionnumber\\$/" + config.version + "/g;s/\\$jsbaseURL\\$/http:\\/\\/pub.bcclabs.com\\//g;s/\\$jsbaseStaticURL\\$/http:\\/\\/static.bcclabs.com\\/pub\\/js\\/sdk/g' -e 's/\\$jsbaseSecureURL\\$/https:\\/\\/pub.bcclabs.com\\//g' -e 's/\\$jsbaseStaticSecureURL\\$/https:\\/\\/s3.amazonaws.com\\/static.bcclabs.com\\/pub\\/js\\/sdk/g' build/bcc.js"
      },
      env_test2: {
        command: "sed -i'.bak' -e 's/\\$buildversionnumber\\$/" + config.version + "/g;s/\\$jsbaseURL\\$/http:\\/\\/pub.bccstudio.com\\//g;s/\\$jsbaseStaticURL\\$/http:\\/\\/static.bccstudio.com\\/pub\\/js\\/sdk/g' -e 's/\\$jsbaseSecureURL\\$/https:\\/\\/pub.bccstudio.com\\//g' -e 's/\\$jsbaseStaticSecureURL\\$/https:\\/\\/s3.amazonaws.com\\/static.bccstudio.com\\/pub\\/js\\/sdk/g' build/bcc.js"
      },
      env_prod: {
        command: "sed -i'.bak' -e 's/\\$buildversionnumber\\$/" + config.version + "/g;s/\\$jsbaseURL\\$/http:\\/\\/pub.brightcontext.com\\//g;s/\\$jsbaseStaticURL\\$/http:\\/\\/static.brightcontext.com\\/pub\\/js\\/sdk/g' -e 's/\\$jsbaseSecureURL\\$/https:\\/\\/pub.brightcontext.com\\//g' -e 's/\\$jsbaseStaticSecureURL\\$/https:\\/\\/static.brightcontext.com\\/pub\\/js\\/sdk/g' build/bcc.js"
      },
      remove_backup_files: {
        command: "rm build/*.bak"
      }
    },

    // gcc: {
    //   dist: {
    //     // options: {
    //     //   compilation_level: 'ADVANCED_OPTIMIZATIONS'
    //     // },
    //     src: ['<config:concat.scripts.dest>'],
    //     dest: 'build/bcc.min.js'
    //   }
    // },

    uglify: {
      nomangle: {
        options: {
          banner: ['/*',
            ' <%= meta.name %> <%= meta.version %>',
            ' <%= meta.website %>',
            ' Copyright (c) <%= grunt.template.today("yyyy") %> <%= meta.organization %>',
            ' Licensed under the MIT License',
            '/'
          ].join("\n *") + "\n",
          sourceMap: 'build/bcc.sourcemap.js',
          sourceMappingURL: 'bcc.sourcemap.js',
          sourceMapPrefix: 1,
          sourceMapRoot: 'http://localhost:8888/build'
        },
        files: {
          'build/bcc.min.js': 'build/bcc.js'
        }
      }
    },

    jasmine: {
      minified: {
        src: 'build/bcc.min.js',
        options: {
          specs: 'tests/spec/*.js',
          outfile: 'tests/headless.html',
          timeout: 300000 // 5 minutes in milliseconds
        }
      }
    },

    watch: {
      // testing: {
      //   files: 'tests/**/*.js',
      //   tasks: ['jasmine']
      // },
      scripts: {
        files: '<%= jshint.all %>',
        tasks: defaultTask
      }
    }
  });

  // Default task.
  grunt.registerTask('default', defaultTask);

  // Additional Packages
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
};
