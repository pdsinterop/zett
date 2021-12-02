import { getDefaultSession } from 'https://cdn.skypack.dev/@inrupt/solid-client-authn-browser'
import { Parser } from 'https://cdn.skypack.dev/n3'


const editor = window.editor;

const app = simply.app({
    routes: { 
    },
    commands: {
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
        'login': (form, values) => {
            document.getElementById('setIssuer').removeAttribute('open');
            return app.actions.connect(values.issuer, values.url)
            .then(() => app.actions.addFile(values.url));
        },
		'showEntity': (el, value) => {
            var selectedCard = document.querySelector('.zett-entity:not(.zett-pre-entity)');
            if (el != selectedCard) {
                selectedCard.classList.add('zett-pre-entity');
                selectedCard.scrollTo(0,0);
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
				let index = pane.d;
			}
		}
    },
    actions: {
        addFile: url => {
            return solidApi.fetch(url)
            .then(data => mergeSubjects(data, url))
            .then(data => {
				let worksheet = app.view.worksheet;
				if (!worksheet) {
					worksheet = 0;
					app.view.worksheet = 0;
				}
				if (!app.view.worksheets[worksheet]) {
					app.view.worksheets[worksheet] = { name: 'new worksheet', files: [] };
				}
                app.view.worksheets[worksheet].files.push( { name: url.split('/').pop(), url, data} );
				app.view.file = app.view.worksheets[worksheet].files.length - 1;
                return data;
            });
        },
        connect: (issuer,url) => solidApi.connect(issuer,url),
        disconnect: () => solidApi.disconnect(),
        showEntity: (index) => {
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
        ]
    }
});

function mergeSubjects(data, baseUrl) {
    var subjects = {};
    data.forEach(rule => {
        let subject = rule.subject.value;
        let predicate = rule.predicate.value;
        let object = rule.object.value;
        if (object.startsWith(baseUrl)) {
            object = object.substring(baseUrl.length);
        }
        if (!subjects[subject]){
            let id = applyPrefix(subject);
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
            predicate = applyPrefix(predicate);
            object = applyPrefix(object);
            subjects[subject].records.push({
                name: predicate,
                value: object
            });
        }
    });
    return Object.values(subjects);
}

function applyPrefix(url) {
    for (const [prefix, purl] of Object.entries(prefixes)) {
        if (url.startsWith(purl)) {
            return prefix+':'+url.substring(purl.length);
        }
    }
    return url;
}

const solidSession = getDefaultSession();

const prefixes = {};

const solidApi = {
    fetch: function(url) {
        const parser = new Parser({blankNodePrefix: '', baseIRI: url});
        return solidSession.fetch(url)
            .then(response => {
                if (response.ok) {
                    return response.text();
                } else {
                    throw new Error('not ok');
                }
            })
            .then(text => parser.parse(
                text, 
                null, 
                (prefix, url) => { prefixes[prefix] = url.id }
            ));
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
                let inputs = document.querySelectorAll('input');
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
                let inputs = document.querySelectorAll('input');
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