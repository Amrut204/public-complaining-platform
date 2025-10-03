const express=require("express");
const app=express();
const path=require("path");
const bcrypt = require('bcrypt');
const methodOverride=require("method-override")
require('dotenv').config();



app.use(methodOverride("_method"))
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_KEY,      // change this in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,                // true only if you're using HTTPS
    maxAge: 10000 * 60   // optional: 1 day
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
};

const loginSchema= new mongoose.Schema({
    
    username:String,
    uniq:String,
    email:String,
    mobile:String,
    password:String, 
    district:String,
    taluka:String,
    village:String,
    role:String,
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
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

const adminSchema= new mongoose.Schema({
    
    username:String,
    uniq:String,
    email:String,
    mobile:String,
    password:String, 
    district:String,
    taluka:String,
    village:String,
    role:String,
     status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
 
    
})
const adminloginSchema=new mongoose.Schema({
    username:String,
    password:String
})

const adminLogin=mongoose.model("adminLogin",adminloginSchema)

const admin=mongoose.model("admin",adminSchema);
const login=mongoose.model("login",loginSchema);
function generateRandomId(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
      id += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return id;
  }
  function generateRandomId2(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < length; i++) {
      id += characters.charAt(Math.floor(Math.random() * characters.length+2));
    }
    return id;
  }
  
  


app.get("/",async(req,res)=>{

 
    res.render("dashboard.ejs")
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
        let uniqCode=generateRandomId2(10)

        let user = await login.create({
           

            username,
             uniq:uniqCode,
            email,
            mobile,
            password: hashedPassword, // store hashed password
            district,
            taluka,
            village,
            role,
             status:"pending"
        });

        if(role=="Area Representative"){
           
        let check = await admin.create({
           uniq:uniqCode, 
           username,
            email,
            mobile,
            password: hashedPassword, // store hashed password
            district,
            taluka,
            village,
            role,
            status:"pending"
        });
        }

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
        } else if (findUser.role === "Area Representative" && findUser.status=="approved") {
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
   try {
        // Find Area Representative
        const areaRep = await login.findOne({ district, taluka, village, role: "Area Representative" });
        if (!areaRep) {
             return res.send("there is no arear representative signed in for your village");
        }

        // Find civilian user
        const civilian = await login.findById(id);
        if (!civilian) {  return res.send("there is no arear representative signed in for your village");
          
        }

        // Add complaint to both users
        areaRep.complaint.push(complaintobj);
        await areaRep.save();

        civilian.complaint.push(complaintobj);
        await civilian.save();

        return res.redirect("/home");
    } catch (err) {
        console.error(err);
        return res.redirect("/home?areaRepMissing=1");
    }
 
})

//route to ensure resolved//
app.post("/resolved/:id",async(req,res)=>{
    const{id}=req.params;
    const {email,desc}=req.body;
     let transporter=nodemailler.createTransport({
    service:"gmail",
    auth:{
      user:process.env.EMAIL,
      pass:process.env.APPPASS
    }
  })
  let mailOption={
    from:process.env.FROMEMAIL,
    to:email,
    subject:"regarding your complaint",
    text:"your complaint '"+desc+" 'is now resolved please check by yourself"
  };
  try{
    await transporter.sendMail(mailOption);
  }catch(error){
    res.status(500).send("erro sending email")
  }
    
  let resolve1=await login.updateMany(
  { "complaint.complainer_id": String(id),},
  { $set: { "complaint.$[].resolved": "Yes" } }
);



console.log(resolve1)
    res.redirect("/home2")
})

app.get("/loginasadmin",async(req,res)=>{
res.render("adminlogin.ejs")
})

//post request for admin login
app.post("/adminlogin",async(req,res)=>{
    const {username,password}=req.body;
    const findUser = await adminLogin.findOne({ username });

        if (!findUser) {
            return res.send("Invalid credentials");
        }

    
        const validPassword = await bcrypt.compare(password, findUser.password);

        if (!validPassword) {
            return res.send("Invalid credentials");
        }

        req.session.userId = findUser._id;
        if(validPassword){
            res.redirect("/admin")
        }

    

  
})
//route for admin approval
// approve
app.post("/admin/approve/:uniq", async (req, res) => {
  try {
    let ok = await login.findOneAndUpdate(
      { uniq: req.params.uniq }, 
      { status: "approved" }, 
      { new: true }
    );
       let fine = await admin.findOneAndUpdate(
      { uniq: req.params.uniq }, 
      { status: "approved" }, 
      { new: true }
    );
    console.log(fine)

    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error approving representative");
  }
});

// reject
app.post("/admin/reject/:uniq", async (req, res) => {
  try {
    await login.findOneAndUpdate(
      { uniq: req.params.uniq },
      { status: "rejected" },
      { new: true }
    );
      let av=await admin.findOneAndUpdate(
      { uniq: req.params.uniq },
      { status: "rejected" },
      { new: true }
    );
    console.log(av)
    res.redirect("/admin");
  } catch (err) {
    res.status(500).send("Error rejecting representative");
  }
});

//listening port 
const port=process.env.PORT ||3000;
app.listen(port,()=>console.log(`listening ${port}`))

