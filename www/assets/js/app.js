//import { getDefaultSession } from 'https://cdn.skypack.dev/pin/@inrupt/solid-client-authn-browser@v1.11.2-wX2J3i2GZ76es9PyIWrw/mode=imports,min/optimized/@inrupt/solid-client-authn-browser.js'
//import { Parser } from 'https://cdn.skypack.dev/pin/n3@v1.12.0-JyCuQEtqH88WU0Kn0PZm/mode=imports,min/optimized/n3.js'

const getDefaultSession = solidAuthn.getDefaultSession;
const Parser = n3.Parser;

const editor = window.editor;
const fd     = window.FloatingUIDOM;
const menu   = document.querySelector('#zett-menu');

const app = simply.app({
    routes: { 
    },
    commands: {
        'showMenu': (el, value) => {
            menu.style.display = 'block';
            document.body.addEventListener('click', function() {
                menu.style.display = '';
            }, { once: true });
        },
        'showFileMenu': (el, value) => {
            let checkbox = el.querySelector('input.ds-dropdown-state');
            checkbox.checked = !checkbox.checked;
            if (checkbox.checked) {
                document.body.addEventListener('click', function() {
                    checkbox.checked = false;
                }, { once: true });
            }            
        },
        'addRecord': (el, values) => {
            app.view.worksheets[app.view.worksheet].files[app.view.file].data[app.view.entity].records.push({
                name: values.name,
                value: values.value
            });
            el.elements.name.value = '';
            el.elements.value.value = '';
            el.elements.name.focus();
        },
        'addEntity': (el, value) => {
            let data = app.view.worksheets[app.view.worksheet].files[app.view.file].data;
            let currentEntity = data[app.view.entity];
            let newEntity = {
                id: 'id'+(data.length+1),
                type: currentEntity.type,
                records: [
                ]
            };
            data = data.splice(app.view.entity+1, 0, newEntity);
            app.view.entity += 1;
            window.setTimeout(() => {
                document.querySelectorAll('.zett-entity').forEach(e => {e.classList.add('zett-pre-entity')});
                document.querySelector('#'+newEntity.id).classList.remove('zett-pre-entity');
                document.querySelector('#'+newEntity.id+' input[name=name]').focus();
            }, 100);
        },
        'showAddFileDialog': (el, value) => {
            document.getElementById('addFileDialog').setAttribute('open','open');
        },
        'closeDialog': (el,value) => {
            el.closest('dialog').removeAttribute('open');
        },
        'addFile': (form, values) => {
            document.getElementById('addFileDialog').removeAttribute('open');
            app.actions.addFile(values.url).then(() => {
                window.setTimeout(() => {
                    document.querySelector('.zett-entity').classList.remove('zett-pre-entity');
                    document.querySelector('.zett-entity [name="value"]').focus();
                }, 100);
            })
            .catch(error => {
                app.view.fetchUrl = values.url;
                document.getElementById('setIssuer').setAttribute('open','open');
            })
        },
		'addNewFile': () => {
			app.actions.addNewFile().then(() => {
				//
			});
		},
        'login': (form, values) => {
            document.getElementById('setIssuer').removeAttribute('open');
            return app.actions.connect(values.issuer, values.url)
            .then(() => app.actions.addFile(values.url));
        },
		'login-basic': (form, values) => {
			document.getElementById('setIssuer').removeAttribute('open');
			return app.actions.addFile(values.url, {username:values.username,password:values.password});
		},
		'showEntity': (el, value) => {
            var file = el.closest('.zett-pane');
            var selectedCard = file.querySelector('.zett-entity:not(.zett-pre-entity)');
            if (el != selectedCard) {
				if (selectedCard) {
	                selectedCard.classList.add('zett-pre-entity');
    	            selectedCard.scrollTo(0,0);
				}
                el.classList.remove('zett-pre-entity');
				let firstInputValue = el.querySelector('input[name="value"]');
				if (!firstInputValue) {
					return;
				}
				let activeElement = document.activeElement;
				if (!activeElement || document.activeElement.tagName!='INPUT') {
					firstInputValue.focus();
					return;
				}
            }
		},
		'selectFile': (el, value) => {
			let pane = el.closest('.zett-pane');
			if (pane) {
				// bring pane to the front                
                if (app.view.selectedPane) {
                    app.view.selectedPane.style.zIndex = '';
                }
                app.view.selectedPane = pane;
                pane.style.zIndex=1000;
				// find which file index it is
                let key = pane.dataBinding.config.parentKey;
				// set app.view.file to that index
                // TODO
			}
		},
        'saveFile': (el, value) => {
            let file = app.actions.getFileBinding(el);
            if (!file.url || file.url==='#') {
                file.url = prompt('Please enter a URL for this file');
            }
            app.actions.saveFile(file).then(response => {
                app.view.alerts.unshift({
                    "data-simply-template": "info",
                    "message": "File saved",
                    "state": "new"
                });
            })
            .catch(response => {
                app.view.alerts.unshift({
                    "data-simply-template": "error",
                    "message": "File not save: "+response.status,
                    "state": "new"
                });                
            });
        },
        'closeFile': (el, value) => {
            let pane = el.closest('.zett-pane');
            pane.remove();            
        },
        'deleteEntity': (el, value) => {
            app.actions.deleteEntity(el);
        },
        'showDeleted': (el, value) => {
            el.closest('.zett-pane').classList.toggle('zett-show-deleted')
        },
        'undeleteEntity': (el, value) => {
            app.actions.undeleteEntity(el).then(() => {
                if (el && el.closest('.zett-entity')) {
                    el.closest('.zett-entity').classList.remove('zett-hidden');
                }
            });
        }
    },
    actions: {
        getFileBinding: (el) => {
            let pane = el.closest('.zett-pane');
            return pane.dataBinding.config.fieldDataParent; // make this more robust
        },
		addNewFile: () => {
			let worksheet = app.view.worksheet;
			if (!worksheet) {
				worksheet = 0;
				app.view.worksheet = 0;
			}
			if (!app.view.worksheets[worksheet]) {
				app.view.worksheets[worksheet] = { name: 'new worksheet', files: [] };
			}
			app.view.worksheets[worksheet].files.push( { 
                name: 'new-resource.ttl', 
                url:'#',
                prefixes: {},
                data:[{
                    id: 'id1',
                    type: 'skos:Thing',
                    records: [{
                        name: '',
                        value: ''
                    }]
                }]
            });
			app.view.file = app.view.worksheets[worksheet].files.length - 1;
			return new Promise((resolve, reject) => {
				resolve([]);
			});
		},
        addFile: (url,loginInfo) => {
            return solidApi.fetch(url, loginInfo)
            .then(result => {
                result.data = mergeSubjects(result.data, url, result.prefixes);
                return result;
            })
            .then(result => {
				let worksheet = app.view.worksheet;
				if (!worksheet) {
					worksheet = 0;
					app.view.worksheet = 0;
				}
				if (!app.view.worksheets[worksheet]) {
					app.view.worksheets[worksheet] = { name: 'new worksheet', files: [] };
				}
                app.view.worksheets[worksheet].files.push( { name: url.split('/').pop(), url:url, data:result.data, prefixes:result.prefixes} );
				app.view.file = app.view.worksheets[worksheet].files.length - 1;
                return result;
            });
        },
        saveFile: function(file) {
            let content = jsonToTurtle(file.data, file.url, file.prefixes);
            return solidApi.write(file.url, content, 'text/turtle');
        },
        connect: (issuer,url) => solidApi.connect(issuer,url),
        disconnect: () => solidApi.disconnect(),
        showEntity: (index) => {
        },
        deleteEntity: (el) => {
            var item = el.closest('.zett-entity').dataBinding.config.data;
            var file = el.closest('.zett-pane').dataBinding.config.data;
            if (!file.prefixes['lm']) {
                file.prefixes['lm'] = 'https://purl.org/pdsinterop/link-metadata#';
            }
            if (!item.hidden) {
                item.records.push({
                    'data-simply-template': 'Literal',
                    'name': 'lm:deleted',
                    'value': 'zett: removed by user'
                });
                item.hidden = true;
            }
            return new Promise((resolve,reject) => {
                resolve(item);
            });
        },
        undeleteEntity: (el) => {
            var item = el.closest('.zett-entity').dataBinding.config.data;
            var file = el.closest('.zett-pane').dataBinding.config.data;
            if (item.hidden) {
                var index = item.records.findIndex(r => {
                    return r.name==='lm:deleted' || r.name=='lm:redirectPermanent'
                });
                if (index!==false) {
                    item.records.splice(index, 1);
                }
                item.hidden = false;
            }
            return new Promise((resolve,reject) => {
                resolve(item);
            });
        },
        movePermanent: (el, data, sibling) => {
            function getIndex(el) {
                var index = 0;
                while (el && el.previousElementSibling) {
                    index++;
                    el = el.previousElementSibling;
                }
                return index;
            }
            function getReference(path) {
                var pathnames = path.split('/').filter(Boolean);
                var ref = editor.pageData;
                pathnames.forEach(pathname => {
                    ref = ref[pathname];
                });
                return ref;
            }
            function getParentReference(path) {
                var pathnames = path.split('/').filter(Boolean);
                pathnames.pop();
                return getReference(pathnames.join('/'));        
            }
            function getFileReference(path) {
                var pathnames = path.split('/').filter(Boolean);
                var ref = editor.pageData;
                do {
                    var pathname = pathnames.shift();
                    ref = ref[pathname];
                } while (pathname && pathname!=='files');
                if (!pathname) {
                    return null;
                }
                return ref[pathnames.shift()];
            }
            function getPrefixes(entity, prefixes) {
                function getPrefix(value, prefixes) {
                    var pos = value.indexOf(':');
                    if (pos!==false) {
                        var prefix = value.substring(0, pos);
                        if (prefixes[prefix]) {
                            return { alias: prefix, url: prefixes[prefix] };
                        }
                    }
                    return null;
                }
                var usedPrefixes = {};
                entity.records.forEach(r => {
                    switch(r['data-simply-template']) {
                        case 'NamedNode':
                            var p = getPrefix(r.name, prefixes);
                            if (p) {
                                usedPrefixes[p.alias] = p.url;
                            }
                            var p = getPrefix(r.value, prefixes);
                            if (p) {
                                usedPrefixes[p.alias] = p.url;
                            }
                        break;
                        case 'Literal':
                            var p = getPrefix(r.name, prefixes);
                            if (p) {
                                usedPrefixes[p.alias] = p.url;
                            }
                        break;
                        case 'BlankNode':
                            throw new Error('todo');
                        break;
                    }
                });
                return usedPrefixes;
            }
            var path = el.dataBinding.config.parentKey;
            var newParentPath = data.dataBinding.config.parentKey+'data/';
            var newIndex = Math.max(0,getIndex(sibling)-1);
            var newParent = getReference(newParentPath);
            var oldParent = getParentReference(path);
            var oldIndexPos = path.substring(0, path.length-2).lastIndexOf('/')+1;
            var oldIndex = parseInt(path.substring(oldIndexPos, path.length-1));
            var item = JSON.parse(JSON.stringify(oldParent[oldIndex]));

            var oldFile = getFileReference(path);

            oldParent.splice(oldIndex, 1);
            if (oldParent !== newParent) {
                var file = getFileReference(newParentPath);

                var existingEntity = newParent.filter((e) => {
                    return e.id == item.id
                }).pop();
                if (existingEntity) {
                    if (existingEntity.hidden) {
                        // remove deleted or redirect existingEntity
                        var index = newParent.indexOf(existingEntity);
                        if (index<newIndex) {
                            newIndex--;
                        }
                        newParent.splice(index, 1);
                    } else {
                        // todo: ask for merge or copy (new id)
                        alert('todo: ask for merge or copy');
                    }
                } else {
                    // add redirectPermanent marker
                    if (!oldFile.prefixes['lm']) {
                        oldFile.prefixes['lm'] = 'https://purl.org/pdsinterop/link-metadata#'
                    }
                    var oldItem = JSON.parse(JSON.stringify(item));
                    oldItem.records.push({
                        'data-simply-template': 'NamedNode',
                        'name': 'lm:redirectPermanent',
                        'url': file.url+item.id,
                        'value': file.url+item.id
                    });
                    oldItem.hidden = true;
                    oldParent.push(oldItem);
                    /*
                    oldParent.push({
                        id: item.id,
                        records: [{
                            'data-simply-template': 'NamedNode',
                            'name': 'lm:redirectPermanent',
                            'url': file.url+item.id,
                            'value': file.url+item.id
                        }],
                        hidden: true
                    });
                    */
                }
                var prefixes = getPrefixes(item, oldFile.prefixes);
                Object.entries(prefixes).forEach(prefix => {
                    if (file.prefixes[prefix[0]]) {
                        if (file.prefixes[prefix[0]]!==prefix[1]) {
                            alert('FIXME: same prefix alias used for different urls')
                        }
                    } else {
                        file.prefixes[prefix[0]] = prefix[1];
                    }
                });
            }
            newParent.splice(newIndex, 0, item);
        }
    },
    view: {
        worksheet: 0,
        file: 0,
        entity: 0,
        worksheets: [
            {
                name: 'new worksheet',
                files: [],
                ontologies: [],
                queries: []
            }
        ],
        alerts: []
    }
});

document.addEventListener('click', function(event) {
    var pane = event.target.closest('.zett-pane');
    if (pane) {
        app.commands.selectFile(event.target);
    }
}, {capture: true});

function mergeSubjects(data, baseUrl, prefixes) {
    var subjects = {};
	var blankNodes = {};
    data.forEach(rule => {
        let subject = rule.subject.value;
        let predicate = rule.predicate.value;
        let object = rule.object.value;
		switch(rule.object.termType) {
			case 'BlankNode':
				if (!blankNodes[rule.object.value]) {
					object = [];
					blankNodes[rule.object.value] = object;
				} else {
					object = blankNodes[rule.object.value];
				}
		        if (!subjects[subject]){
		            let id = applyPrefix(subject, prefixes);
		            if (subject.startsWith(baseUrl)) {
		                id = subject.substring(baseUrl.length);
		            }
		            subjects[subject] = {
		                id: id,
		                type: '',
		                records: []
		            };
		        }
	            predicate = applyPrefix(predicate, prefixes);
	            subjects[subject].records.push({
					'data-simply-template': rule.object.termType,
	                name: predicate,
	                value: object
	            });
			break;
			case 'NamedNode':
		        if (typeof object=='string') {
					if (object.startsWith(baseUrl)) {
			            object = object.substring(baseUrl.length);
			        } else {
						object = applyPrefix(object, prefixes);
					}
				}
				if (rule.subject.id.substring(0,2)=='_:') {
					predicate = applyPrefix(predicate, prefixes);
					let blankNodeID = rule.subject.id.substring(2);
					if (!blankNodes[blankNodeID]) {
						blankNodes[blankNodeID] = [];
					}
					blankNodes[blankNodeID].push({
						'data-simply-template': rule.object.termType,
						name: predicate,
						value: object
					});
					break;
				}
                var url = rule.object.value;
			//FALLTHROUGH
			case 'Literal':
		        if (!subjects[subject]){
		            let id = applyPrefix(subject, prefixes);
		            if (subject.startsWith(baseUrl)) {
		                id = subject.substring(baseUrl.length);
		            }
		            subjects[subject] = {
		                id: id,
		                type: '',
		                records: []
		            };
		        }
		        if (predicate == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
		            subjects[subject].type = object;
		        } else {
		            predicate = applyPrefix(predicate, prefixes);
		            object = applyPrefix(object, prefixes);
                    var record = {
                        'data-simply-template': rule.object.termType,
                        name: predicate,
                        value: object
                    };
                    if (url) {
                        record.url = url;
                    }
		            subjects[subject].records.push(record);
		        }
			break;
		}
    });
    return Object.values(subjects);
}

function applyPrefix(url, prefixes) {
	if (typeof url == 'string') {
	    for (const [prefix, purl] of Object.entries(prefixes)) {
	        if (url.startsWith(purl)) {
	            return prefix+':'+url.substring(purl.length);
	        }
	    }
	}
    return url;
}

function jsonToTurtle(data, uri, prefixes) {
    var turtle=[];
    function emptyLine() {
        return '';
    }
    function specialchars(uri) {
      return uri
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    }
    function createPrefix(prefix, uri) {
        return '@prefix '+prefix+': <'+specialchars(uri)+'> .';
    }
    function uri(uri, prefixes) {
        let prefix = uri.split(':')[0];
        if (uri && prefixes[prefix]) {
            return specialchars(uri);
        }
        return '<'+specialchars(uri)+'>';
    }

    function getValue(node, prefixes) {
        var value = '';
        switch (node['data-simply-template']) {
            case 'Literal':
                value = '"'+specialchars(node.value)+'"';
            break;
            case 'NamedNode':
                value = uri(node.value, prefixes);
            break;
            case 'BlankNode':
                if (Array.isArray(node.value)) {
                    var predicates = {};
                    node.value.forEach(blankNode => {
                        addPredicate(predicates, blankNode, prefixes);
                    });
                    value = "[\n\t\t" + createTriples('', predicates, prefixes) + " ]";
                } else {
                    debugger;
                }
            break;
        }
        return value;
    }
    function addPredicate(predicates, record, prefixes) {
        var value = getValue(record, prefixes);
        
        if (predicates[record.name]) {
            if (!Array.isArray(predicates[record.name])) {
                predicates[record.name] = [ predicates[record.name] ]; 
            }
            predicates[record.name].push(value);
        } else {
            predicates[record.name] = value;
        }
    }

    function createTriples(subject, predicates, prefixes) {
        var triples = uri(subject, prefixes)+' ';
        var predicatesLines = [];
        Object.entries(predicates).map((entry) => {
            if (Array.isArray(entry[1])) {
                predicatesLines.push(entry[0]+' '+(entry[1].join(', ')));
            } else {
                predicatesLines.push(entry[0]+' '+entry[1]);
            }
        });
        return triples + predicatesLines.join(" ;\n\t");
    }

    Object.entries(prefixes).forEach((entry) => {
        turtle.push(createPrefix(entry[0], entry[1]));
    });
    turtle.push(emptyLine());
    data.forEach((entity) => {
        var subject = entity.id;
        var predicates = {};
        if (entity.type) {
            predicates['rdf:type'] = uri(entity.type, prefixes); //TODO: make sure that rdf is in prefixes
        }
        if (entity.records) {
            entity.records.forEach(record => {
                addPredicate(predicates, record, prefixes);
            });
        }
        turtle.push(createTriples(subject, predicates, prefixes) + ' .');

        turtle.push(emptyLine());
    });
    return turtle.join("\n");
}
window.jsonToTurtle = jsonToTurtle;

const solidSession = getDefaultSession();

const solidApi = {
    fetch: function(url, loginInfo) {
        const parser = new Parser({blankNodePrefix: '', baseIRI: url});
		var fetchParams = {
			mode: 'cors',
			headers: {
				'Accept': 'application/*'
			}
		};
		if (loginInfo && loginInfo.username && loginInfo.password) {
			fetchParams.headers.Authorization = 'Basic '+btoa(loginInfo.username+':'+loginInfo.password);
		}
		return fetch(url, fetchParams)
			.catch(error => {
		        return solidSession.fetch(url)
			})
            .then(response => {
                if (response.ok) {
                    return response.text();
                } else {
					return solidSession.fetch(url).then(response => {
						if (response.ok) {
							return response.text();
						} else {
		                    throw new Error('Could not fetch resource: '+response.status+': '+response.statusText);
						}
					});
                }
            })
            .then((text,error) => {
				if (!error) {
                    var prefixes = {};
					var data = parser.parse(text, null, (prefix, url) => { prefixes[prefix] = url.id });
                    return { data: data, prefixes: prefixes };
				} else {
					alert(error);
				}
			});
    },
    write: function(url, body, contentType='text/turtle') {
        var fetchParams = {
            headers: {
                'Content-Type': contentType
            },
            body: body,
            method: 'PUT'
        }
        return solidSession.fetch(url, fetchParams).then(response => {
            if (response.ok) {
                return response;
            } else {
                throw response;
            }
        });
    },
    connect: function(issuer, resourceUrl) {
        if (solidSession.info && solidSession.info.isLoggedIn === false) {
            let url = new URL(window.location);
            url.searchParams.set('resourceUrl', resourceUrl);
            return solidSession.login({
                oidcIssuer: issuer,
                redirectUrl: url.href
            })
        }
        return solidSession.info
    },
    disconnect: function() {
        return solidSession.logout();
    },
    getPodUrl: function(webIdUrl) {
        return solidApi.fetch(webIdUrl.href)
            .then(quads => quads.find(quad => quad.predicate.value.includes('pim/space#storage')).object.value)
            .then(podUrl => {
                if ( ! podUrl.endsWith('/')) {
                    podUrl += '/'
                }
                return podUrl
            });
    }
};

window.app = app;
window.solidApi = solidApi;
window.solidSession = solidSession;

solidSession.handleIncomingRedirect({url: window.location.href, restorePreviousSession: true})
.then(() => {
    let search = new URLSearchParams(window.location.search);
    if (search.has('resourceUrl') && solidSession.info && solidSession.info.isLoggedIn) {
        let resourceUrl = search.get('resourceUrl');
        if (resourceUrl) {
            app.actions.addFile(resourceUrl).then(() => {
                window.setTimeout(() => {
                    document.querySelector('.zett-entity').classList.remove('zett-pre-entity');
                    document.querySelector('.zett-entity [name="value"]').focus();
                }, 100);
            });
            history.replaceState({}, window.title, window.location.pathname);
        }
    }
});

(function() {
    let selectionStart = 0;

    function focus(input, range=null) {
        input.focus();
		input.scrollIntoView();        
        if (range) {
            input.setSelectionRange(range[0], range[1]);
        } else {
            input.setSelectionRange(selectionStart, selectionStart);
        }
    }

    function keepSelection(input) {
        if (input.value.length>selectionStart) {
            selectionStart = input.selectionStart;
        } else {
            if (input.selectionStart<input.value.length) {
                selectionStart = input.selectionStart;
            }
        }
    }

    let keys = {
        'ArrowDown': (e) => {
            if (e.target && e.target.tagName=='INPUT') {
                keepSelection(e.target);
                let inputs = document.querySelectorAll('input[name="'+e.target.name+'"]');
                for (let i=0; i<inputs.length; i++) {
                    if (inputs[i]===e.target) {
                        let next = inputs[i+1];
                        if (next) {
                            focus(next);
                        }
                        e.preventDefault();
                        return false;
                    }
                }
            }
        },
        'ArrowUp': (e) => {
            if (e.target && e.target.tagName=='INPUT') {
                keepSelection(e.target);
                let inputs = document.querySelectorAll('input[name="'+e.target.name+'"]');
                for (let i=0; i<inputs.length; i++) {
                    if (inputs[i]===e.target) {
                        let prev = inputs[i-1];
                        if (prev) {
                            focus(prev);
                        }
                        e.preventDefault();
                        return false;
                    }
                }
            }
        },
        'ArrowLeft': (e) => {
            if (e.target && e.target.tagName=='INPUT') {
                if (e.target.selectionStart>0) {
                    return;
                }
                let inputs = document.querySelectorAll('input[type="text"]');
                for (let i=0; i<inputs.length; i++) {
                    if (inputs[i]===e.target) {
                        let prev = inputs[i-1];
                        if (prev) {
                            focus(prev);
                        }
                        e.preventDefault();
                        return false;
                    }
                }
            }
        },
        'ArrowRight': (e) => {
            if (e.target && e.target.tagName=='INPUT') {
                if (e.target.selectionEnd<e.target.value.length) {
                    return;
                }
                let inputs = document.querySelectorAll('input[type="text"]');
                for (let i=0; i<inputs.length; i++) {
                    if (inputs[i]===e.target) {
                        let next = inputs[i+1];
                        if (next) {
                            focus(next, [0,0]);
                        }
                        e.preventDefault();
                        return false;
                    }
                }
            }
        },
        'PageDown': (e) => {
            // TODO: support multiple open files
            var selectedCard = document.querySelector('.zett-entity:not(.zett-pre-entity)');
            var cards =  document.querySelectorAll('.zett-entity');
            for (let i=0; i<cards.length; i++) {
                if (cards[i]===selectedCard) {
                    let next = cards[i+1];
                    if (next) {
                        let input = next.querySelector('input[name="value"]');
                        focus(input, [0,0]);
                        e.preventDefault();
                        return false;
                    }
                }
            }
        },
        'PageUp': (e) => {
            // TODO: support multiple open files
            var selectedCard = document.querySelector('.zett-entity:not(.zett-pre-entity)');
            var cards =  document.querySelectorAll('.zett-entity');
            for (let i=0; i<cards.length; i++) {
                if (cards[i]===selectedCard) {
                    let prev = cards[i-1];
                    if (prev) {
                        let input = prev.querySelector('input[name="value"]');
                        focus(input, [0,0]);
                        e.preventDefault();
                        return false;
                    }
                }
            }
        },
        'Enter': (e) => {
            if (e.target && e.target.tagName=='INPUT') {
                if (e.target.closest('form')) {
                    return; // handle form enters normally
                }
                let records = e.target.closest('[data-simply-list="records"]');
                debugger;
            }            
            e.preventDefault();
            return false;
        }
    };

    window.addEventListener('keydown', (e) => {
        if (e.defaultPrevented) {
            return;
        }
		if (!e.target || !e.target.closest('[data-simply-keyboard]')) {
			return;
		}
        if (keys[e.code]) {
            keys[e.code](e);
        }
    });

    document.body.addEventListener('focusin', (e) => {
        if (e.target) {
            let entity = e.target.closest('.zett-entity');
			if (entity) {
	            app.commands.showEntity(entity);
			}
        }
    });

})();

interact('.zett-pane').draggable({
	allowFrom: '.zett-drag-handle',
	listeners: {
		move (event) {
			let position = {
				x: parseInt(event.target.dataset.simplyPositionX || 0) + event.dx,
				y: parseInt(event.target.dataset.simplyPositionY || 0) + event.dy
			};
			event.target.style.transform = `translate(${position.x}px, ${position.y}px`;
			event.target.dataset.simplyPositionX = position.x;
			event.target.dataset.simplyPositionY = position.y;
            event.preventDefault();
		}
	}
});

interact('.zett-pane').resizable({
	edges: { right: true, bottom: true },
	listeners: {
		move (event) {
			let position = {
				x: parseInt(event.target.dataset.simplyPositionX || 0) + event.deltaRect.left,
				y: parseInt(event.target.dataset.simplyPositionY || 0) + event.deltaRect.top
			};

			let width = Math.max(120, event.rect.width);
			let height = Math.max(120, event.rect.height);

	        Object.assign(event.target.style, {
	            width: `${width}px`,
	            height: `${height}px`,
	            transform: `translate(${position.x}px, ${position.y}px)`
	        });

	        Object.assign(event.target.dataset, { x: position.x, y: position.y });
            event.preventDefault();
		}
	}
});

var zettDrag = dragula([], {
    accepts: function(el, target, source, sibling) {
        function getFileReference(path) {
            var pathnames = path.split('/').filter(Boolean);
            var ref = editor.pageData;
            do {
                var pathname = pathnames.shift();
                ref = ref[pathname];
            } while (pathname && pathname!=='files');
            if (!pathname) {
                return null;
            }
            return ref[pathnames.shift()];
        }
        var path = target.dataBinding.config.parentKey;
        var file = getFileReference(path);
        if (!file.url || file.url==='#') {
            return false;
        }
        return true;
    }
});
(function() {
    var lists = document.querySelectorAll('[data-simply-activate="drag-cards"]');
    var canvas = document.querySelector('.zett-canvas');
    zettDrag.on('drag',(el,source) => {
        editor.fireEvent('databinding:pause', canvas);
        lists.forEach(list => {
            editor.fireEvent('databinding:pause', list);
            console.log('drag: paused',list);
        });
        console.log(el.dataBinding.config);
    });
    zettDrag.on('cancel', (el, container, source) => {
        lists.forEach(list => {
            editor.fireEvent('databinding:resume', list);
            console.log('drag: resumed',list);
        });
        editor.fireEvent('databinding:resume', canvas);
    });
    zettDrag.on('drop',(el, target, source, sibling) => {
        lists.forEach(list => {
            editor.fireEvent('databinding:resume', list);
            console.log('drag: resumed',list);
        });
        editor.fireEvent('databinding:resume', canvas);
        app.actions.movePermanent(el, target, sibling);
    });
    simply.activate.addListener('drag-cards', function() {
        canvas = document.querySelector('.zett-canvas');
        lists = document.querySelectorAll('[data-simply-activate="drag-cards"]');
        if (!zettDrag.containers.includes(this)) {
            zettDrag.containers.push(this);
            console.log('drag: added',this)
        }
    });
})();

editor.transformers.position = {
    render: function(position) {
        this.dataset.simplyPositionX = position.x || 0;
        this.dataset.simplyPositionY = position.y || 0;
        this.style.transform = `translate(${position.x}px, ${position.y}px`;
        return position;
    },
    extract: function() {
        return {
            x: this.dataset.simplyPositionX || 0,
            y: this.dataset.simplyPositionY || 0
        };
    }
};
editor.transformers.hideHidden = {
    render: function(data) {
        this.originalValue = data;
        if (data) {
            this.closest('.zett-entity').classList.add('zett-hidden');
        }
        return data;
    },
    extract: function(data) {
        return this.originalValue;
    }
}

var purgeTimer;
function purgeToasts() {
    editor.pageData.alerts = [];
}
document.addEventListener("animationend", function(evt) {
    if (evt.animationName == "ds-toast-show") {
        evt.target.setAttribute("data-state", "shown");
        evt.target.classList.add("ds-toast-animated");
    }
    if (evt.animationName == "ds-toast-hide") {
        if (purgeTimer) {
            window.clearTimeout(purgeTimer);
        }
        purgeTimer = window.setTimeout(purgeToasts, 200);
    }
});
