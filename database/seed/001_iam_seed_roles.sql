#eREQChannel ENDPOINTS - PLAIN PAYLOAD
Base Url: http://10.65.1.102/v1.0.2/

http://10.65.1.102/v1.0.2/getToken
{
    "userId": "cardrequest",
    "password": "1234",
    "client_secret": "client@sEcReT123"
}

https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/hello-world
https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/listRoutes

https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/getToken
{
    "userId": "ugold",
    "password": "1234",
    "client_secret": "client@sEcReTxyz"
}

https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/getAvailableCards
{
    "account_id" : "0000688498"
}
0000652897
0000271263
{
    "account_id": "0000688498",
    "name_on_card": "Victor Uzoma Nwosu",
    "programme_id": "ROAGN",
    "delivery_address_1": "2ND FLOOR, 6, AOLAT ABIKE CLOSEhhhhhhhhhhhhhhhhhhhhhhhhh",
    "delivery_address_2": "ALAGBOLE, OGUN STATEuuuuuuuuuuuuuuuuuuuuuuuuu",
    "delivery_phone": "88888888889888"
}
https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/branches/search
{ 
    "searchText" : "aba"
}

https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/requestCard
{
    "account_id": "0000688498",
    "name_on_card": "Victor Uzoma Nwosu",
    "programme_id": "ROAGN",
    "pickup_branch": "9999",
    "delivery_address_1": "2ND FLOOR, 6, AOLAT ABIKE CLOSEhhhhhhhhhhhhhhhhhhhhhhhhh",
    "delivery_address_2": "ALAGBOLE, OGUN STATEuuuuuuuuuuuuuuuuuuuuuuuuu",
    "delivery_phone": "88888888889888",
    "state": "UPc"
}

{
    "account_id": "0000492428",
    "name_on_card": "Victor Uzoma Nwosu",
    "programme_id": "ROAGN",
    "delivery_address_1": "2ND FLOOR, 6, AOLAT ABIKE CLOSEhhhhhhhhhhhhhhhhhhhhhhhhh",
    "delivery_address_2": "ALAGBOLE, OGUN STATEuuuuuuuuuuuuuuuuuuuuuuuuu",
    "delivery_phone": "88888888889888"
}

https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/requestStatus
{
    "request_seq" : "24711",
    "programme_id" : "ROAGN"
}

https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/cancelCardRequest
{
    "request_seq" : "24571",
    "account_id" : "0000688498",
    "programme_id" : "ROAGN"
}
{
    "request_seq": "24710",
    "account_id": "0000688498",
    "programme_id": "ROAGN"
}


https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/getActiveCards
{
  "account_id": "0000688498"
}
0000652897
0000271263

https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/hotlistCard
{
    "hashed_pan": "201d42eb0586a4a32bf7fa019e571eb9",
	"seq_nr": "000",
    "issuer_nr": "1",
    "reason" : "41"
}

{
    "hashed_pan": "201d42eb0586a4a32bf7fa019e571eb8",
    "seq_nr": "000",
    "issuer_nr": "1",
    "reason": "41"
}

https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/branches/by-state
{ 
    "state_code" : "AB"
}

https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/branches
{ 
    "page" : "1",
	"limit" : "3",
	"search" : "AB"
}

https://127.0.0.1/erequestubn/channels/ereqchannels/v1.0.1/branches/grouped