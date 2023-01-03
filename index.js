const express = require("express");
const app = express();
const cors = require("cors");
const mongodb = require("mongodb");
const mongoclient = mongodb.MongoClient;
const dotenv = require("dotenv").config();
const URL = process.env.db;
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const EMAIL = process.env.email;
const PASSWORD = process.env.password;

app.use(
  cors({
    // orgin: "http://localhost:3000",
    orgin: "https://neon-sundae-639b6b.netlify.app",
  })
);

app.use(express.json());

app.post("/register", async (req, res) => {
  try {
    const connection = await mongoclient.connect(URL);
    const db = connection.db("url_shortener");

    const salt = await bcrypt.genSalt(10);
    // console.log(salt)
    // $2b$10$5qVBhca30n201BEG7HPTpu
    const hash = await bcrypt.hash(req.body.password, salt);
    // console.log(hash)
    // $2b$10$5qVBhca30n201BEG7HPTpu66Jjeq1ONFAYa5/mE.IUc1aezLOsZmi

    req.body.password = hash;
    delete req.body.confirmpassword;
    const emailFinding = await db
      .collection("users")
      .findOne({ email: req.body.email });

    if (emailFinding) {
      res.json({ message: "Email-id already registered, use another" });
    } else {
      const user = await db.collection("users").insertOne(req.body);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: EMAIL,
          pass: PASSWORD,
        },
       
      });
      const mailOptions = {
        from: EMAIL,
        to: req.body.email,
        subject: "Activate Account",
        html: `<h3>🙋‍♂️Hi <b>${req.body.name}</b>, your Account created successfully✨  </h3>
       `,
      };
      transporter.sendMail(mailOptions, function (error, response) {
        if (error) {
          console.log(error);
          return;
        }
      });
      transporter.close();

      res.json({ message: "Account created successfully" });
    }

    await connection.close();
  } catch (error) {
    res.status(500).json({ message: "something went wrong" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const connection = await mongoclient.connect(URL);
    const db = connection.db("url_shortener");

    const user = await db
      .collection("users")
      .findOne({ email: req.body.email });

    await connection.close();
    if (user) {
      const compare = await bcrypt.compare(req.body.password, user.password);

      if (compare) {
        res.json({ message: "Login successfully" });
      } else {
        res.json({ message: "email or password incorrect" });
      }
    } else {
      res.json({ message: "email or password incorrect" });
    }
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
});

app.post("/forgot", async (req, res) => {
  try {
    const connection = await mongoclient.connect(URL);
    const db = connection.db("url_shortener");

    const user = await db
      .collection("users")
      .findOne({ email: req.body.email });
    if (user) {
      var digits = "0123456789";
      let OTP = "";
      for (let i = 0; i < 5; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
      }

      //    console.log( OTP)

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(OTP, salt);
      //    console.log(hash)
      const store = await db
        .collection("users")
        .updateOne({ email: user.email }, { $set: { otp: hash } });

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: EMAIL,
          pass: PASSWORD,
        },
      });
      const mailoptions = {
        form: EMAIL,
        to: req.body.email,
        subject: "Forgot Password",
        html: `<h1>🙋‍♂️Hi ${user.name}, Your OTP for create new password is ${OTP}. Use recently received OTP
        </h1>`,
      };
      transporter.sendMail(mailoptions, function (error, response) {
        if (error) {
          console.log(error);
          return;
        }
      });
      transporter.close();

      res.json({ message: "id finded", email: `${user.email}` });
    } else {
      res.json({ message: "Account not found in this email-Id" });
    }

    await connection.close();
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
});

app.post("/forgot/otp/:email_id", async (req, res) => {
  try {
    const connection = await mongoclient.connect(URL);
    const db = connection.db("url_shortener");

    const user = await db
      .collection("users")
      .findOne({ email: req.params.email_id});
    if (user) {
      const compare = await bcrypt.compare(req.body.otp, user.otp);
      if (compare) {
        res.json({ message: "OTP correct" });
      } else {
        res.json({ message: "OTP incorrect" });
      }
    }

    await connection.close();
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
});

app.post("/forgot/otp/new_password/:email_id", async (req, res) => {
  try {
    const connection = await mongoclient.connect(URL);
    const db = connection.db("url_shortener");
    delete req.body.newpassword;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(req.body.confirmpassword, salt);
    req.body.confirmpassword = hash;
    const user = await db
      .collection("users")
      .updateOne(
        { email: req.params.email_id},
        { $set: { password: req.body.confirmpassword } }
      );
    const user2 = await db
      .collection("users")
      .updateOne({ email: req.params.email_id}, { $set: { otp: "" } });
    res.json({ message: "Password Created Successfully" });
    await connection.close();
  } catch (error) {
    res.status(400).json({ message: "something went jjwrong" });
  }
});

app.post("/change", async (req, res) => {
  try {
    const connection = await mongoclient.connect(URL);
    const db = connection.db("url_shortener");

    const user = await db
      .collection("users")
      .findOne({ email: req.body.email });
    if (user) {
      res.json({ message: "id finded", email: `${user.email}` });
    } else {
      res.json({ message: "Account not found in this email-Id" });
    }

    await connection.close();
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
});

app.post("/change/:email_id", async (req, res) => {
  try {
    const connection = await mongoclient.connect(URL);
    const db = connection.db("url_shortener");
    const emailFinding = await db
      .collection("users")
      .findOne({ email: req.params.email_id });

    if (emailFinding) {
      const compare = await bcrypt.compare(
        req.body.currentpassword,
        emailFinding.password
      );

      if (compare) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(req.body.confirmpassword, salt);
        req.body.confirmpassword = hash;
        delete req.body.newpassword;

        const user = await db
          .collection("users")
          .updateOne(
            { email: req.params.email_id },
            { $set: { password: req.body.confirmpassword } }
          );

        res.json({ message: "Password Changed Successfully" });
      } else {
        res.json({ message: "Current Password Incorrect" });
      }
    } else {
      res.json({ message: "user_id undefined" });
    }

    await connection.close();
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
});



app.post("/create_link", async (req, res) => {
  try {
    const connection = await mongoclient.connect(URL);
    const db = connection.db("url_shortener");
    let shortUrl = generateUrl();
     await db
      .collection("links")
      .insertOne({
        longUrl: req.body.longUrl,
        shortUrl: shortUrl,
        userId:req.body.userId,
        count:0
      });

      const link =await db.collection("links").findOne({ longUrl: req.body.longUrl });
    await connection.close();
    res.json(link);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.get("/linklist/:userId", async (req, res) => {
  try {
    const connection = await mongoclient.connect(URL);
    const db = connection.db("url_shortener");
    const linklist = await db.collection("links").find({ userId:(req.params.userId)}).toArray();
    await connection.close();
    res.json(linklist);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong for user creation" });
  }
});

//delete link
app.delete("/delete/:urlId", async (req,res)=>{
  try {
    const connection = await mongoclient.connect(URL);
    const db = connection.db("url_shortener");
    const linklist = await db.collection("links").deleteOne({ _id:mongodb.ObjectId(req.params.urlId) })
    await connection.close();
    res.json(linklist);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong for user creation" });
  }
});

//redirect link
app.get("/:urlId", async (req,res)=>{
  try {
    const connection = await mongoclient.connect(URL);
    const db = connection.db("url_shortener");
    const redirectLink = await db.collection("links").findOne({ shortUrl:req.params.urlId })
    await db.collection("links").updateOne({ shortUrl:req.params.urlId },{ $inc: { count: 1 } })
    await connection.close();
   // console.log(redirectLink.longUrl);
    res.redirect(redirectLink.longUrl);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong for user creation" });
  }
})

//frond end redirect
app.get('/',function(req,res){
    res.redirect('https://neon-sundae-639b6b.netlify.app');
  });




function generateUrl() {
  var rndResult = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;

  for (var i = 0; i < 5; i++) {
    rndResult += characters.charAt(
      Math.floor(Math.random() * charactersLength)
    );
  }
  // console.log(rndResult);
  return rndResult;
}




app.listen(process.env.PORT || 5002);
