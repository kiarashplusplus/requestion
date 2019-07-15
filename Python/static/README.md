/static directory has a specific structure that will be used in cached_query_from_static.py.

Every directory under /static defines a 'query'. Each 'png' file under a query directory
will be uploaded as a 'sticker' and its name is used for 'redirectUrl'. If there is a directory
with the same name, images in that directory will be uploaded as 'alternatives' stickers.

File names have an '_' instead of '/' which will be replacted before using as 'redirectUrl'.


