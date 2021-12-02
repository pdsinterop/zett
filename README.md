# zett, a [solid](https://solidproject.org/) editor

Zett aims to make it easy to create and edit linked data, and visualize it. 

Zett is a structured editor, which makes sure you end up with syntactically valid linked data. It is also a demo of the PDS Interop Solid Migrator metadata specification. You can open multiple resources and move data entities from one resource to another, while leaving a 'breadcrumb trail' behind. This means that if other linked data links to an entity in your resource, and you move the linked entity to a new resource, zett leaves a redirect instruction in the original location.

Zett is initially developed for the [DAPSI](https://dapsi.ngi.eu/) [PDS Migrator](https://pdsinterop.org/solid-migrator/) project.

## vision

The aims for zett are:
- make a better editor for linked data, specifically ttl (turtle)
- make a playground for exploring and working with linked data, based on a mindmap approach

The W3C EasierRDF project (https://github.com/w3c/easierrdf) lists many
issues, one of which is the “Lack of a Good Editor”. Zett attempts to become that editor.

Zett will allow you to edit any linked data resource. It will
autocomplete information from available online resources (you may supply your
own or select from a default list, like WikiData). It will suggest possible terms from
existing ontologies to use, using an AI trained on existing available linked data.
The editor will make it impossible to create syntactically incorrect linked data files.

In addition the editor will allow you to view any part of the data using different
UI views. The editor will suggest suitable views based on the data, and the links
in the data. You can add extra repositories with possible views. Views can be found
based on the mime-type of the data, e.g. HTML, images, video, etc. But if the data
is itself linked data, views can be specific to the RDF type of the data or the types
of a network of linked data.

The editor will have a mindmap view for any kind of data. There you can drag/drop any
URL and select a suitable view. You can add links between elements and specify the
predicate of the link, creating a linked data subject-predicate-object term. The mindmap
will have its own ontology and format that will be a normal RDF linked data resource,
which also includes the spatial information to render the mindmap exactly as intended.

A mindmap can also embed another mindmap (or any linked data resource). This will be
rendered as a nested set, which you can enlarge or on which you can define your own UI view.

You can also add extra views on data that is already included. This can be used, for example,
to show a map of a selection of stores. If you filter the stores selection, the map will then
automatically update.


## Roadmap

1. MVP 
- cards UI for any linked data (done)
- autocomplete data and predicates based on linked resources
- simple mindmap view
- storage: readonly URL, Solid Data (done)
- storage: write back to Solid Data

2. Mindmap UI
- allow HTML 5 drag/drop of any url
- allow custom views on mindmap elements
- allow cross domain resources and views
- create a mindmap resource format and ontology
- enhance placement and size control by the user

3. Integration API
- make a pluggable views architecture
- bridge this to semantic components
- allow the user to add extra repositories with views

4. AI
- train a neural network on a large set of linked data, to predict probable predicates based on object-subject relations
- add autosuggest to relations (predicates)
