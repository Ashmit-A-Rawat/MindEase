// src/spotify/Playlists.jsx
import axios from "axios";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

export default function Playlists({ token, setSelectedPlaylistId }) {
  const [playlists, setPlaylists] = useState([]); // local playlist state

  useEffect(() => {
    if (!token) return;

    const getPlaylistData = async () => {
      try {
        // 1️⃣ Fetch user playlists
        const userResponse = await axios.get("https://api.spotify.com/v1/me/playlists", {
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
        });

        const userItems = userResponse.data.items.map(({ name, id }) => ({ name, id }));

        // 2️⃣ Fetch admin playlists from backend
        const adminResponse = await axios.get("http://localhost:5000/admin-playlists");
        const adminItems = adminResponse.data.map((p) => ({
          ...p,
          name: `Admin: ${p.name}`,
        }));

        // 3️⃣ Combine admin + user playlists
        setPlaylists([...adminItems, ...userItems]);
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    };

    getPlaylistData();
  }, [token]);

  return (
    <Container>
      <ul>
        {playlists.map(({ name, id }) => (
          <li key={id} onClick={() => setSelectedPlaylistId(id)}>
            {name}
          </li>
        ))}
      </ul>
    </Container>
  );
}

const Container = styled.div`
  color: #b3b3b3;
  height: 100%;
  overflow: hidden;

  ul {
    list-style-type: none;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    height: 55vh;
    max-height: 100%;
    overflow: auto;

    &::-webkit-scrollbar {
      width: 0.7rem;

      &-thumb {
        background-color: rgba(255, 255, 255, 0.6);
      }
    }

    li {
      transition: 0.3s ease-in-out;
      cursor: pointer;

      &:hover {
        color: white;
      }
    }
  }
`;
