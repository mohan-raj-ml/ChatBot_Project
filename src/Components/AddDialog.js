import React, { useState } from 'react'; // Add import for useState
import { auth, db } from "../DataBase/FireBase";
import { addDoc, collection , updateDoc } from "firebase/firestore";

import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import { DialogContent, TextField } from '@mui/material';
import addBtn from "../assets/add-30.png";

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
}));

const CustomizedDialogs = () => {
  const [open, setOpen] = useState(false); // Declare useState hook
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [databaseName, setDatabaseName] = useState('');

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddDatabase = async () => {
    try {
      const user = auth.currentUser;

      if (user) {
        // Get the current user ID (replace this with your authentication logic)
        const userId = user.uid;

        // Add the database data to Firestore
        const userCollection = collection(db, `users/${userId}/DatabaseData`);

        const docRef = await addDoc(userCollection, {
          username: userName,
          password: password,
          dbname: databaseName,
          
        });
        const docId = docRef.id;
        await updateDoc(docRef, { id: docId });
        // Clear the input fields
        setUserName('');
        setPassword('');
        setDatabaseName('');

        // Close the dialog
        setOpen(false);
      } else {
        console.error("User not authenticated.");
      }
    } catch (error) {
      console.error('Error adding database to Firestore: ', error);
    }
  };

  return (
    <React.Fragment>
      <button className="midBtn" onClick={handleClickOpen}>
        <img src={addBtn} alt="new chat" className="addBtn" />
        Add Database
      </button>
      <Dialog onClose={handleClose} aria-labelledby="customized-dialog-title" open={open}>
        <DialogTitle id="customized-dialog-title">Provide the Credentials</DialogTitle>
        <IconButton aria-label="close" onClick={handleClose} sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}>
          <CloseIcon />
        </IconButton>
        <DialogContent dividers>
          <TextField
            autoFocus
            margin="dense"
            id="input1"
            label="User Name"
            type="text"
            fullWidth
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <TextField
            margin="dense"
            id="input2"
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TextField
            margin="dense"
            id="input3"
            label="Database Name"
            type="text"
            fullWidth
            value={databaseName}
            onChange={(e) => setDatabaseName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={handleAddDatabase}>ADD</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

export default CustomizedDialogs;
