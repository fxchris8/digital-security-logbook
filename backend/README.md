# API Contract

## Authentication

### Response Missing Token

```json
{
  "code": 401,
  "status": "Unauthroized",
  "error": "Missing Token"
}
```

- Menandakan tidak ada token yang dikirim melalui HTTP Only Cookie. Maka arahkan ke page Login.

### Response Signature Failed

```json
{
  "code": 401,
  "status": "Unautrhorized",
  "error": "Signature Failed"
}
```

- Menandakan bahwa token yang dikirim tidak valid (bukan berasal dari server). Maka token akan dihapus.

### Response Token Expired

```json
{
  "code": 401,
  "status": "Unauthorized",
  "error": "Token Expired"
}
```

- Menandakan bahwa token sudah expired.

---

## POST /login

### Request

```json
{
  "username": "username",
  "password": "password"
}
```

### Response Success

### Response Success

```json
{
  "code": 200,
  "status": "Ok",
  "data": {
    "id": 1,
    "username": "nathan"
  }
}
```

### Respose Failed

```json
{
  "code": 400,
  "status": "Bad Request",
  "error": "Invalid username or password"
}
```

---

## GET /reports

### Request

```json
{
  "anchor_id": 0,
  "page": "next | prev",
  "page_size": 10,
  "filter": "<empty> | MDP | FDP | SDP"
}
```

- pakai query params.
- `anchor_id` digunakan untuk pagination descending. Page awal pakai `anchor_id=0`; setelah itu `next` mengambil id lebih kecil dari `anchor_id`, sedangkan `prev` mengambil id lebih besar.
- `page` digunakan sebagai pagination direction.
- `page_size` digunakan untuk jumlah data yang ingin ditampilkan.
- `filter`: untuk filter, kalau tidak pake filter, tidak perlu dikirim

> Untuk page awal, kirim `anchor_id`-nya `0` dan `filter`-nya `""`.

### Response Success

```json
{
    "code": 200,
    "status": "Ok",
    "data": {
        "results": [
            {
                "id": 1,
                "vessel_name": "test",
                "nama": "mr. a",
                "jabatan": "MUALIM 1",
                ...
            },
        ],
        "first_id": 1,
        "last_id": 10,
        "page_size": 10,
        "has_more": true,
        "first_page": true
    }
}
```

### Response Failed

```json
{
  "code": 400,
  "status": "Bad Request",
  "error": "sdasdsd"
}
```

---

## GET /reports/idp-count

### Response Success

```json
{
  "code": 200,
  "status": "Ok",
  "data": {
    "fdp": 100,
    "mdp": 200,
    "sdp": 300
  }
}
```

### Response Failed

```json
{
  "code": 500,
  "status": "Internal Server Error",
  "error": "Something went wrong..."
}
```
