(function() {

    var template = require('jsdoc/template'),
    fs = require('fs'),
    helper = require('jsdoc/util/templateHelper'),
    scopeToPunc = {
        'static': '.',
        'inner': '~',
        'instance': '#'
    };

    /**
        @global
        @param {TAFFY} data See <http://taffydb.com/>.
        @param {object} opts
        @param {Tutorial} tutorials
     */
    publish = function(data, opts, tutorials) {
        console.log(opts);

        var defaultTemplatePath = __dirname + '/' + 'templates/default';
        var templatePath = (opts.template) ? opts.template : defaultTemplate;
        var out = '';
        var view = new template.Template(templatePath + '/tmpl');

        // set up templating
        view.layout = 'layout.tmpl';

        // set up tutorials for helper
        helper.setTutorials(tutorials);

        function find(spec) {
            return data.get(data.find(spec));
        }

        function htmlsafe(str) {
            return str.replace(/</g, '&lt;');
        }

        function addSignatureParams(f) {
            var pnames = [];
            if (f.params) {
                f.params.forEach(function(p) {
                    if (p.name && p.name.indexOf('.') === -1) {
                        if (p.optional) {
                            pnames.push('<span class="optional">' + p.name + '</span>');
                        }
                        else {
                            pnames.push(p.name);
                        }
                    }
                });
            }

            f.signature = (f.signature || '') + '(' + pnames.join(', ') + ')';
        }

        function generateAncestry(thisdoc) {
            var ancestors = [],
            doc = thisdoc;

            while (doc = doc.memberof) {
                doc = find({
                    longname: doc
                });
                if (doc) {
                    doc = doc[0];
                }
                if (!doc) break;
                //ancestors.unshift(linkto(doc.longname, (scopeToPunc[doc.scope] || '') + doc.name));
                ancestors.unshift(doc.name);
            }
            if (ancestors.length) {
                ancestors[ancestors.length - 1] += (scopeToPunc[thisdoc.scope] || '');
            }
            return ancestors;
        }

        function addSignatureReturns(f) {
            var returnTypes = [];

            if (f.returns) {
                f.returns.forEach(function(r) {
                    if (r.type && r.type.names) {
                        if (!returnTypes.length) {
                            returnTypes = r.type.names;
                        }
                    }
                });
            }

            if (returnTypes && returnTypes.length) {
                returnTypes = returnTypes.map(function(r) {
                    return linkto(r);
                });
            }
            f.signature = '<span class="signature">' + (f.signature || '') + '</span>' + '<span class="type-signature">' + (returnTypes.length ? ' &rarr; {' + returnTypes.join('|') + '}': '') + '</span>';
        }

        function addSignatureType(f) {
            var types = [];

            if (f.type && f.type.names) {
                types = f.type.names;
            }

            if (types && types.length) {
                types = types.map(function(t) {
                    return linkto(t, htmlsafe(t));
                });
            }

            f.signature = (f.signature || '') + '<span class="type-signature">' + (types.length ? ' :' + types.join('|') : '') + '</span>';
        }

        function addAttribs(f) {
            var attribs = [];

            if (f.virtual) {
                attribs.push('virtual');
            }

            if (f.access && f.access !== 'public') {
                attribs.push(f.access);
            }

            if (f.scope && f.scope !== 'instance' && f.scope !== 'global') {
                if (f.kind == 'function' || f.kind == 'member' || f.kind == 'constant') attribs.push(f.scope);
            }

            if (f.readonly === true) {
                if (f.kind == 'member') attribs.push('readonly');
            }

            if (f.kind === 'constant') {
                attribs.push('constant');
                f.kind = 'member';
            }

            f.attribs = '<span class="type-signature">' + htmlsafe(attribs.length ? '<' + attribs.join(', ') + '> ': '') + '</span>';
        }

        data.remove({
            undocumented: true
        });
        data.remove({
            ignore: true
        });
        if (!opts.private) {
            data.remove({
                access: 'private'
            });
        }
        data.remove({
            memberof: '<anonymous>'
        });

        var packageInfo = (find({
            kind: 'package'
        }) || [])[0];

        //function renderLinks(text) {
        //    return helper.resolveLinks(text);
        //}
        data.forEach(function(doclet) {
            doclet.attribs = '';


            if (doclet.examples) {
                doclet.examples = doclet.examples.map(function(example) {
                    var caption,
                    code;

                    if (example.match(/^\s*<caption>([\s\S]+?)<\/caption>(\s*[\n\r])([\s\S]+)$/i)) {
                        caption = RegExp.$1;
                        code = RegExp.$3;
                    }

                    return {
                        caption: caption || '',
                        code: code || example
                    };
                });
            }
            if (doclet.see) {
                doclet.see.forEach(function(seeItem, i) {
                    doclet.see[i] = hashToLink(doclet, seeItem);
                });
            }
        });

        data.orderBy(['longname', 'version', 'since']);

        // kinds of containers
        var globals = find({
            kind: ['member', 'function', 'constant', 'typedef'],
            memberof: {
                isUndefined: true
            }
        }),
        modules = find({
            kind: 'module'
        }),
        externals = find({
            kind: 'external'
        }),
        mixins = find({
            kind: 'mixin'
        }),
        namespaces = find({
            kind: 'namespace'
        });

        var outdir = opts.destination;
        if (packageInfo && packageInfo.name) {
            outdir += '/' + packageInfo.name + '/' + packageInfo.version + '/';
        }
        fs.mkPath(outdir);

        // copy static files to outdir
        var fromDir = templatePath + '/static',
        staticFiles = fs.ls(fromDir, 3);

        staticFiles.forEach(function(fileName) {
            var toDir = fs.toDir(fileName.replace(fromDir, outdir));
            fs.mkPath(toDir);
            fs.copyFile(fileName, toDir);
        });

        function linkto(longname, linktext) {
            var url = helper.longnameToUrl[longname];
            return url ? '<a href="' + url + '">' + (linktext || longname) + '</a>': (linktext || longname);
        }

        function tutoriallink(tutorial) {
            return helper.toTutorial(tutorial);
        }

        var containers = ['class', 'module', 'external', 'namespace', 'mixin'];

        data.forEach(function(doclet) {
            var url = helper.createLink(doclet);
            helper.registerLink(doclet.longname, url);
        });

        data.forEach(function(doclet) {
            var url = helper.longnameToUrl[doclet.longname];

            if (url.indexOf('#') > -1) {
                doclet.id = helper.longnameToUrl[doclet.longname].split(/#/).pop();
            }
            else {
                doclet.id = doclet.name;
            }

            if (doclet.kind === 'function' || doclet.kind === 'class') {
                addSignatureParams(doclet);
                addSignatureReturns(doclet);
                addAttribs(doclet);
            }
        })

        // do this after the urls have all been generated
        data.forEach(function(doclet) {
            doclet.ancestors = generateAncestry(doclet);

            doclet.signature = '';

            if (doclet.kind === 'member') {
                addSignatureType(doclet);
                addAttribs(doclet)
            }

            if (doclet.kind === 'constant') {
                addSignatureType(doclet);
                addAttribs(doclet)
            }
        });

        // add template helpers
        view.find = find;
        view.linkto = linkto;
        view.tutoriallink = tutoriallink;
        view.htmlsafe = htmlsafe;
        
        
        var findUniqueNamesAndLinks = function(spec) {
            var matches = data.get(data.find(spec));
            if (matches.length) {
                var names = {};
                matches.forEach(function(m) {
                    if ( !names.hasOwnProperty(m.longname) ) {
                        names[m.longname] = {
                            name: m.name,
                            url: m.longname + ".php"
                        }
                    }
                });
                return names;
            } else {
                return null;
            }
        };
        
        var nav = {
            modules: findUniqueNamesAndLinks({ kind: 'module' }),
            externals: findUniqueNamesAndLinks({ kind: 'external' }),
            classes: findUniqueNamesAndLinks({ kind: 'class' }),
            namespaces: findUniqueNamesAndLinks({ kind: 'namespace' }),
            constants: findUniqueNamesAndLinks({ kind: 'constants' }),
            mixins: findUniqueNamesAndLinks({ kind: 'mixin' }),
            globals: findUniqueNamesAndLinks({
                kind: ['member', 'function', 'constant', 'typedef'],
                'memberof': { 'isUndefined': true }
            })
        };
        view.nav = nav;

        for (var longname in helper.longnameToUrl) {
            var classes = find({
                kind: 'class',
                longname: longname
            });
            if (classes.length) generate('Class: ' + classes[0].name, classes, helper.longnameToUrl[longname]);

            var modules = find({
                kind: 'module',
                longname: longname
            });
            if (modules.length) generate('Module: ' + modules[0].name, modules, helper.longnameToUrl[longname]);

            var namespaces = find({
                kind: 'namespace',
                longname: longname
            });
            if (namespaces.length) generate('Namespace: ' + namespaces[0].name, namespaces, helper.longnameToUrl[longname]);

            //             var constants = find({kind: 'constant', longname: longname});
            //             if (constants.length) generate('Constant: '+constants[0].name, constants, helper.longnameToUrl[longname]);
            var mixins = find({
                kind: 'mixin',
                longname: longname
            });
            if (mixins.length) generate('Mixin: ' + mixins[0].name, mixins, helper.longnameToUrl[longname]);

            var externals = find({
                kind: 'external',
                longname: longname
            });
            if (externals.length) generate('External: ' + externals[0].name, externals, helper.longnameToUrl[longname]);
        }

        if (globals.length) generate('Global', [{
            kind: 'globalobj'
        }], 'global.php');
        generate('Index', [{
            kind: 'mainpage', longname: 'Main Page'
        }], 'index.php');


        function generate(title, docs, filename) {
            var data = {
                title: title,
                docs: docs
            };

            var path = outdir + '/' + filename,
            html = view.render('container.tmpl', data);

            html = helper.resolveLinks(html);
            // turn {@link foo} into <a href="foodoc.html">foo</a>
            fs.writeFileSync(path, html)
        }

        function generateTutorial(title, tutorial, filename) {
            var data = {
                title: title,
                header: tutorial.title,
                content: tutorial.parse(),
                children: tutorial.children
            };

            var path = outdir + '/' + filename,
            html = view.render('tutorial.tmpl', data);

            // yes, you can use {@link} in tutorials too!
            html = helper.resolveLinks(html);
            // turn {@link foo} into <a href="foodoc.html">foo</a>
            fs.writeFileSync(path, html)
        }

        // tutorials can have only one parent so there is no risk for loops
        function saveChildren(node) {
            node.children.forEach(function(child) {
                generateTutorial('Tutorial: ' + child.title, child, helper.tutorialToUrl(child.name));
                saveChildren(child);
            });
        }
        saveChildren(tutorials);
    }

    function hashToLink(doclet, hash) {
        if (!/^(#.+)/.test(hash)) {
            return hash;
        }

        var url = helper.createLink(doclet);

        url = url.replace(/(#.+|$)/, hash);
        return '<a href="' + url + '">' + hash + '</a>';
    }

})();
