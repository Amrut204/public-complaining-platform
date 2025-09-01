const express=require("express");
const app=express();
const path=require("path");
const bcrypt = require('bcrypt');
const methodOverride=require("method-override")
require('dotenv').config();
const bcrypt = require('bcrypt'); 


app.use(methodOverride("_method"))
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_KEY,      // change this in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,                // true only if you're using HTTPS
    maxAge: 1000 * 60   // optional: 1 day
  }
}));



app.set("views",path.join(__dirname,"views"))
app.set("view engine","ejs")
const mongoose=require("mongoose");
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname,"public")))
const { ObjectId } = require('mongodb');
const { error } = require("console");
//connection to db
main().then(res=>{
    console.log("connection is okay")
}).catch(err=>{
    console.log("erro",err)
})
async function main(){
    mongoose.connect(process.env.MONGO_URL)
}

const loginSchema= new mongoose.Schema({
    username:String,
    email:String,
    mobile:String,
    password:String, 
    district:String,
    taluka:String,
    village:String,
    role:String,
    complaint: [
        {
            title: String,
            description: String,
            name:String,
            mobile:String,
            email:String,
            resolved:String,
            complainer_id:String,
            date: { type: Date, default: Date.now }
        }
    ]
})

const login=mongoose.model("login",loginSchema);
function generateRandomId(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
      id += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return id;
  }
  


app.get("/",(req,res)=>{
    res.redirect("/login")
})

//for signup
app.get("/signup",(req,res)=>{
    res.render("signup.ejs")
})


app.post("/signup", async (req, res) => {
    const { username, email, mobile, password, district, taluka, village, role } = req.body;

    try {
        // Hash the password with 10 salt rounds
        const hashedPassword = await bcrypt.hash(password, 10);

        let user = await login.create({
            username,
            email,
            mobile,
            password: hashedPassword, // store hashed password
            district,
            taluka,
            village,
            role
        });

        res.redirect("/login");
    } catch (err) {
        console.log(err);
        res.send("Error creating user");
    }
});







//for login

app.get("/login",async(req,res)=>{
    
  
    res.render("index.ejs")
  
 



})
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const findUser = await login.findOne({ username });

        if (!findUser) {
            return res.send("Invalid credentials");
        }

    
        const validPassword = await bcrypt.compare(password, findUser.password);

        if (!validPassword) {
            return res.send("Invalid credentials");
        }

        req.session.userId = findUser._id;

      
        if (findUser.role === "Civilian") {
            res.redirect("/home");
        } else if (findUser.role === "Area Representative") {
            res.redirect("/home2");
        } else {
            res.send("Role not recognized");
        }

    } catch (err) {
        console.log(err);
        res.send("Error during login");
    }
});

app.get("/home",async(req,res)=>{
    console.log(req.session.userId)
    const mainUser=await login.findById(req.session.userId)
    res.render("home.ejs",{mainUser})

   
})
app.get("/home2",async(req,res)=>{
    console.log(req.session.userId)
    const mainUser=await login.findById(req.session.userId)
    res.render("home2.ejs",{mainUser})

})
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  });
// route for update
app.get("/edit/:id",async(req,res)=>{
    const {id}=req.params
  let edit=await login.findById(id);
  res.render("edit.ejs",{edit})
})
app.put("/edit/:id",async(req,res)=>{
    const {id}=req.params
    const{username,email,mobile,password}=req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const edit=await login.findByIdAndUpdate(id,{
        username:username,
        email:email,
        mobile:mobile,
        password:hashedPassword
    })
res.redirect("/");
})
// route to send complaint
app.post("/home2/:district/:taluka/:village/:id",async(req,res)=>{
    const {district,taluka,village,id}=req.params;
    console.log(village)
    const {complaint,username,mobile,email}=req.body;
    const complaintobj={
        title: "complaint",
        description:complaint,
        name:username,
        mobile:mobile,
        email:email,
        resolved:"No",
        complainer_id:generateRandomId(10),

    }
    await login.findOne({district:district,taluka:taluka,village:village,role:"Area Representative"}).
    then(user=>{
        if(user){
            user.complaint.push(complaintobj);
            return user.save();

        }
        else{
            throw new Error("AREA REPRESENTATIVE MISSING")
        }
    })
    await login.findById(id).
    then(user=>{
        if(user){
            user.complaint.push(complaintobj);
            return user.save();

        }
        else{
            throw new Error("AREA REPRESENTATIVE MISSING")
        }
    }).then(data=>{
        res.redirect("/home")
    })
 
})
//route to ensure resolved//
app.post("/resolved/:id",async(req,res)=>{
    const{id}=req.params;
    let resolve= await login.findOneAndUpdate({"complaint.complainer_id":id},{
         $set: { "complaint.$.resolved": "Yes" }
    })
    res.redirect("/home2")
})



//listening port 
const port=process.env.PORT ||3000;
app.listen(port,()=>console.log("listening 3000"))
