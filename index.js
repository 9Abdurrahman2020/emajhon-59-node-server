const express = require('express')
const { MongoClient } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;
require('dotenv').config()
var admin = require("firebase-admin");

// firebase admin authorization
var serviceAccount = require("./emajhon-21dea-firebase-adminsdk-qluqo-100e92b634.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// middleware
const cors = require('cors')
app.use(cors())
app.use(express.json())

// mongodb uri 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y7ez2.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken (req, res, next){
    if(req.headers?.authorization?.startsWith('Bearer ')){
        const idToken = req.headers.authorization.split('Bearer ')[1]
        try{
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch{

        }
    }
    next()
}


async function server (){
    try{
        await client.connect();
        const database = client.db('emajhon');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders')
        // get api 
        app.get('/products', async(req,res)=>{
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const cursor =  productCollection.find({})
            const count = await cursor.count()
            let products;
            if(page){
                products = await cursor.skip(page*size).limit(size).toArray();
            }else{

                products = await cursor.toArray();
            }
            res.json({ count, products })
        })
        // get specific data with post api 
        app.post('/cart', async(req, res)=>{
            const keys = req.body;
            const query = { key: { $in: keys }}
            const products = await productCollection.find(query).toArray()
            res.send(products)
        })
        // post order
        app.post('/orders', async(req,res)=>{
            const orders = req.body;
            const result = await orderCollection.insertOne(orders);
            res.json(result)
        })
        // get order
        app.get('/orders',verifyToken, async(req,res)=>{
            const email = req.query.email;
            if( req.decodedUserEmail == email ){
                const query = {email: email};
                const result = await orderCollection.find(query).toArray()
                res.json(result)
            }
            else{
                res.status(401).json({message: 'unauthorized user'})
            }
            
        })
    }
    finally{
        // await client.close()
    }
    
}
server().catch(console.dir)


app.get('/', (req,res)=>{
    res.send('ema-jhon node server is running')
})
app.listen(port, ()=>{
    console.log('the server is running on port: ', port);
})