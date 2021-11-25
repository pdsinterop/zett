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
        }
    },
    actions: {
        connect: issuer => solidApi.connect(issuer),
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

const solidSession = getDefaultSession();

const solidApi = {
    fetch: function(url) {
        const parser = new Parser({blankNodePrefix: '', baseIRI: url});
        return solidSession.fetch(url)
            .then(response => response.text())
            .then(text => parser.parse(text));
    },
    connect: function(issuer) {
        if (solidSession.info && solidSession.info.isLoggedIn === false) {
            return solidSession.login({
                oidcIssuer: issuer,
                redirectUrl: window.location.href,
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
window.soliApi = solidApi;