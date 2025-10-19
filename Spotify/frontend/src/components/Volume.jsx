// src/spotify/Volume.jsx
import axios from "axios";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

export default function Volume() {
  const [token, setToken] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("spotifyToken");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const setVolume = async (e) => {
    try {
      await axios.put(
        "https://api.spotify.com/v1/me/player/volume",
        {},
        {
          params: {
            volume_percent: parseInt(e.target.value, 10),
          },
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
        }
      );
    } catch (error) {
      console.error("Error setting volume:", error);
    }
  };

  return (
    <Container>
      <input type="range" min={0} max={100} onMouseUp={setVolume} />
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;

  input {
    width: 15rem;
    height: 0.5rem;
    border-radius: 2rem;
  }
`;
