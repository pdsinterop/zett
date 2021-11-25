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
        }
    },
    actions: {
        addFile: url => {
            return solidApi.fetch(url)
            .then(data => mergeSubjects(data, url))
            .then(data => {
                app.view.worksheets[0].files[0] = { name: 'iets', url, data};
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
                files: [
/*
                    {
                        name: 'new file',
                        url: '',
                        data: [
                            {
                                id: 'id1',
                                type: 'tmo:Task',
                                records: [
                                    {
                                        name: 'dct:title',
                                        value: 'A title'
                                    }
                                ]
                            }
                        ]
                    }
*/
                ],
                ontologies: [
                    {
                        prefix: 'dc',
                        url: 'http://purl.org/dc/elements/1.1/'
                    },
                    {
                        prefix: 'dct',
                        url: 'http://purl.org/dc/terms/'
                    },
                    {
                        prefix: 'rdf',
                        url: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
                    }
                ],
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
            .then(text => parser.parse(text, null, (prefix, url) => { prefixes[prefix] = url.id }));
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
    if (window.location.search) {
        let search = new URLSearchParams(window.location.search);
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

