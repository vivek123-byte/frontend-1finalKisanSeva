import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Fade,
  Grow,
  styled,
  Paper,
  useTheme,
} from "@mui/material";

// Styled components for custom look
const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    borderRadius: "24px",
    overflow: "hidden",
    background: theme.palette.background.paper,
    boxShadow: theme.shadows[10],
    [theme.breakpoints.down("sm")]: {
      margin: theme.spacing(2),
    },
  },
}));

const RoleCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: "16px",
  textAlign: "center",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  border: `1px solid ${theme.palette.divider}`,
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: theme.shadows[6],
  },
}));

const RoleIcon = styled("div")(({ theme }) => ({
  fontSize: "2.5rem",
  marginBottom: theme.spacing(2),
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.success.light,
  color: theme.palette.success.contrastText,
}));

const UserRoleModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleRoleSelect = useCallback(
    (role) => (event) => {
      event.stopPropagation();
      localStorage.setItem("userRole", role);
      onClose();
      setTimeout(() => {
        if (role === "farmer") {
          navigate("/farmer-dashboard");
        } else if (role === "buyer") {
          navigate("/buyer-dashboard");
        } else if (role === "general") {
          navigate("/general-market");
        }
      }, 300);
    },
    [navigate, onClose]
  );

  const roles = [
    {
      id: "farmer",
      title: "Farmer",
      description: "Sell your agricultural products",
      icon: "🌱",
      color: theme.palette.success.main,
    },
    {
      id: "buyer",
      title: "Buyer",
      description: "Purchase fresh farm products",
      icon: "🛒",
      color: theme.palette.info.main,
    },
    {
      id: "general",
      title: "Market Explorer",
      description: "Browse all available products",
      icon: "🏪",
      color: theme.palette.warning.main,
    },
  ];

  return (
    <StyledDialog
      open={isOpen}
      onClose={onClose}
      TransitionComponent={Grow}
      transitionDuration={300}
      maxWidth="md"
      fullWidth
      aria-labelledby="role-selection-title"
      BackdropProps={{
        sx: {
          background: "rgba(0, 0, 0, 0.5)",
        },
        TransitionComponent: Fade,
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(135deg, #f9c922 0%, #4a934a 100%)`,
          py: 4,
          px: 2,
        }}
      >
        <DialogTitle
          id="role-selection-title"
          sx={{ textAlign: "center", py: 0 }}
        >
          <Typography
            variant="h3"
            component="h2"
            sx={{
              fontWeight: 700,
              color: theme.palette.common.white,
              mb: 1,
              textShadow: "1px 1px 3px rgba(0,0,0,0.2)",
            }}
          >
            Welcome to AgriConnect
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: theme.palette.grey[100],
              fontWeight: 400,
            }}
          >
            Please select your role to continue
          </Typography>
        </DialogTitle>
      </Box>

      <DialogContent sx={{ py: 4, px: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 3,
            mt: 2,
          }}
        >
          {roles.map((role) => (
            <RoleCard key={role.id} elevation={0}>
              <RoleIcon sx={{ backgroundColor: role.color }}>
                {role.icon}
              </RoleIcon>
              <Typography variant="h5" component="h3" gutterBottom>
                {role.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {role.description}
              </Typography>
              <Button
                variant="contained"
                onClick={handleRoleSelect(role.id)}
                sx={{
                  mt: "auto",
                  backgroundColor: role.color,
                  color: theme.palette.getContrastText(role.color),
                  "&:hover": {
                    backgroundColor: role.color,
                  },
                }}
              >
                Select
              </Button>
            </RoleCard>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
        <Button
          onClick={onClose}
          variant="text"
          sx={{
            color: theme.palette.text.secondary,
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default UserRoleModal;
