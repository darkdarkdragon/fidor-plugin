'use strict';

module.exports = function (grunt) {
  var jsFiles = [
        'Gruntfile.js',
        'index.js',
        'package.json',
        'controllers/**/*.js',
        'processes/**/*.js',
        'test/**/*.js'
      ];

  grunt.initConfig({

    jsdoc : {
      dist : {
        src: ['./index.js', './lib/api/*.js'],
        options: {
          destination: './doc/jsdoc'
        }
      }
    },

    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/http/**/*.js']
      }
    },

    jshint: {
      files: jsFiles,
      options: {
        jshintrc: '.jshintrc'
      }
    },

    watch: {
      livereload: {
        files: jsFiles,
        tasks: ['jshint'],
        options: {  }
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('test', ['jshint', 'mochaTest']);

  grunt.registerTask('default', ['jshint']);
};
