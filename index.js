const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql2');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
uuidv4();
const { faker } = require('@faker-js/faker');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(methodOverride('_method'));

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "school",
  password: "12345",
});


app.get("/", (req, res) => {
  let q = "SELECT * FROM signup_login LIMIT 1";
  connection.query(q, (err, result) => {
    if (err) throw err;
    if (result.length === 0) {
      // No user found → Show signup form
      res.render("signup.ejs");
    } else {
      // User exists → Redirect to login page
      res.redirect("/students/login");
    }
  });
});

app.get('/students/total', (req, res) => {
  let q = "SELECT COUNT(*) as total FROM student";
  try {
    connection.query(q, (err, result) => {
      if (err) throw err;
      let count = result[0].total;
      res.render("home.ejs", { count });
    })

  }
  catch (error) {
    console.log(error);
    res.send("Some error occurred in Database...");
  }

});

// Show Route
app.get('/students', (req, res) => {
  let q = "select * from student order by Created_At desc";
  try {
    connection.query(q, (err, stud,) => {
      if (err) throw err;
      res.render("show.ejs", { stud });
    })

  }
  catch (error) {
    console.log(error);
    res.send("Some error occurred in Database...");
  }

});

//New Route

app.get('/students/new', (req, res) => {
  res.render("new.ejs");
});
app.post("/students/new", (req, res) => {
  let id = uuidv4();
  let { fullName, gender, dob, cls, section, address, fatherName, motherName, contactNo } = req.body;
  let admissionNo = faker.number.int({ min: 1000, max: 9999 }); // 4-digit unique

  let q = `
    INSERT INTO student 
      (id, admissionNo, fullName, gender, dob, cls, section, address, fatherName, motherName, contactNo, admissionDate) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  let values = [id, admissionNo, fullName, gender, dob, cls, section, address, fatherName, motherName, contactNo];

  try {
    connection.query(q, values, (err, result) => {
      if (err) throw err;
      res.redirect("/students");
    });
  } catch (error) {
    console.log(error);
    res.send("Some error occurred in Database...");
  }
});

// verify route to go to edit route

app.get("/students/:id/verify", (req, res) => {
  let id = req.params.id;
  res.render("edit_verify.ejs", { id });
});

app.post("/students/verify", (req, res) => {
  let { fullName, admissionNo } = req.body;

  let q = "SELECT * FROM student WHERE fullName = ? AND admissionNo = ?";
  connection.query(q, [fullName, admissionNo], (err, result) => {
    if (err) throw err;
    if (result.length === 0) {
      return res.send("<script>alert('Incorrect Name or Admission Number, Try Again'); window.location.href='/students';</script>");
    }

    let student = result[0];
    res.redirect(`/students/${student.id}/edit`);
  });
});

// edit route
app.get("/students/:id/edit", (req, res) => {
  let id = req.params.id;
  let q = "SELECT * FROM student WHERE id = ?";
  connection.query(q, [id], (err, result) => {
    if (err) throw err;
    if (result.length === 0) {
      return res.send("Student not found");
    }
    res.render("edit.ejs", { student: result[0] });
  });
});

app.patch("/students/:id", (req, res) => {
  let { fullName, motherName, fatherName, address, contactNo, dob, section } = req.body;
  let id = req.params.id;
  let q = `
    UPDATE student 
    SET fullName = ?, motherName = ?, fatherName = ?, address = ?, contactNo = ?, dob = ?, section = ?  WHERE id = ?`;
  let values = [fullName, motherName, fatherName, address, contactNo, dob, section, id];

  try {
    connection.query(q, values, (err, result) => {
      if (err) throw err;
      res.redirect("/students");
    });
  } catch (error) {
    console.log(error);
    res.send("Some error occurred in Database...");
  }
})


// verify route to go to destroy route
app.get("/students/:id/deleteVerify", (req, res) => {
  let id = req.params.id;
  res.render("delete_verify.ejs", { id });
});

app.post("/students/deleteVerify", (req, res) => {

  let { fullName, admissionNo } = req.body;
  let q = "SELECT * FROM student WHERE fullName = ? AND admissionNo = ?";
  connection.query(q, [fullName, admissionNo], (err, result) => {
    if (err) throw err;
    if (result.length === 0) {
      return res.send("<script>alert('Incorrect Name or Admission Number, Try Again'); window.location.href='/students';</script>");
    }
    let id = result[0].id;

    // Verified - delete student
    let deleteQuery = "DELETE FROM student WHERE id = ?";
    connection.query(deleteQuery, [id], (err, deleteResult) => {
      if (err) throw err;
      // Show confirmation message and redirect to students list
      res.send("<script>alert('Student deleted successfully.'); window.location.href='/students';</script>");

    });
  });
});

// signup route

app.get("/students/signup", (req, res) => {
  res.render("signup.ejs");
})

app.post("/students/signup", (req, res) => {
  let { email, password } = req.body;
  let q = "INSERT INTO signup_login (email, password) VALUES (?, ?)";
  connection.query(q, [email, password], (err, result) => {
    if (err) throw err;

    // req.session.user = { email };
    res.redirect("/students/login");
  });
});

// login route

app.get("/students/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/students/login", (req, res) => {
  let { email, password } = req.body;
  let q = "SELECT * FROM signup_login WHERE email = ? AND password = ?";

  connection.query(q, [email, password], (err, result) => {
    if (err) throw err;

    if (result.length === 1) {
      res.redirect("/students"); // Login success
    } else {
      res.send("<script>alert('Invalid credentials'); window.location.href='/students/login';</script>");
    }
  });
});


app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
});


