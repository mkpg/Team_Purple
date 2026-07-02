from bson import ObjectId

def serialize_doc(doc) -> dict:
    """Recursively convert MongoDB ObjectId objects to strings in a document."""
    if doc is None:
        return {}
    
    serialized = {}
    for key, value in doc.items():
        if key == "_id":
            serialized["id"] = str(value)
        elif isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, dict):
            serialized[key] = serialize_doc(value)
        elif isinstance(value, list):
            serialized[key] = [
                serialize_doc(item) if isinstance(item, dict) else (str(item) if isinstance(item, ObjectId) else item)
                for item in value
            ]
        else:
            serialized[key] = value
    return serialized

def serialize_list(docs) -> list:
    """Convert a list of MongoDB documents into JSON-serializable list of dicts."""
    return [serialize_doc(doc) for doc in docs]
