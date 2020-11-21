# EasyBox
EasyBox is a website created to easily host and update a database with only HTTP requests. It is heavily inspired by [jsonbox](https://jsonbox.io) and [jsonstore](https://jsonstore.io). We're currently in the process on transitioning from jsonbox to this because of two main reasons:
  - Unlimted storage
  - Free and reliable

There is also a public copy of this repo running on https://easybox.bots.wtf if you want to use that instead.

# Contributing
If you want to you can contribute to this to improve it. Just fork this GitHub repo on your device, set to enviroment variables ``MONGODB`` (connection url for mongodb) and ``HASH_KEY`` (a random key used for generating box id) and then run ``npm start``! Check the ``TODO`` in index.js, add some things and create a PR!


# Documentation

```
POST /new (send empty data OR if you want a protected box with authorization, send { 'requiresAuth': true }) - Will return a value called ``boxID`` with the ID of your box. If you need authorization, it will also send a key. You will need to put this on the ``Authorization`` header when sending requests to your bot.
```

```
POST /copy/<box_id> (send empty data) - Will return a value called ``boxID`` with the ID of your box. All data from the jsonbox provided will be copied to your box
```

```
GET /box/<box_id> - Will return a JSON data containing all the collections in the box.
```

```
GET /box/<box_id>/<collection_name> - Will return JSON data from the collection name listed
```

```
POST /box/<box_id>/<collection_name> - Add data to a collection with the data in the body
```

```
DELETE /box/<box_id>/<collection_name> - Will delete a collection, which will delete all the element in the collection.
```

```
DELETE /box/<box_id>/<collection_name>/<document_id> - Will delete the document from the collection
```

```
PUT /box/<box_id>/<collection_name>/<document_id> - Will update the document in that collection with the new data
```