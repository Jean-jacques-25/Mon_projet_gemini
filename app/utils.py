import math

def get_gps_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371 # Radius of earth in kilometers
    return c * r

def string_hash(s):
    """
    Simple deterministic hash generator matching the JS server.ts stringHash algorithm.
    Used for local anti-fraud validation indexing and deduplicating image/coordinators records.
    """
    h = 0
    for char in s:
        h = (h << 5) - h + ord(char)
        h &= 0xFFFFFFFF # Keep 32-bit int representation
    return abs(h)
