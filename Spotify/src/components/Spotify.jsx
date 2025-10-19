import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import styled from "styled-components";
import Footer from "./Footer";
import Navbar from "./Navbar";
import axios from "axios";
import Body from "./Body";

export default function Spotify() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userInfo, setUserInfo] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);

  const [navBackground, setNavBackground] = useState(false);
  const [headerBackground, setHeaderBackground] = useState(false);
  const bodyRef = useRef();

  const bodyScrolled = () => {
    const scroll = bodyRef.current.scrollTop;
    setNavBackground(scroll >= 30);
    setHeaderBackground(scroll >= 268);
  };

  // Fetch user info
  useEffect(() => {
    if (!token) return;

    const getUserInfo = async () => {
      try {
        const { data } = await axios.get("https://api.spotify.com/v1/me", {
          headers: { Authorization: "Bearer " + token },
        });
        setUserInfo({
          userId: data.id,
          userUrl: data.external_urls.spotify,
          name: data.display_name,
        });
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };
    getUserInfo();
  }, [token]);

  // Fetch playback state
  useEffect(() => {
    if (!token) return;

    const getPlaybackState = async () => {
      try {
        const { data } = await axios.get("https://api.spotify.com/v1/me/player", {
          headers: { Authorization: "Bearer " + token },
        });
        setPlayerState(data?.is_playing);
      } catch (error) {
        console.error("Error fetching playback state:", error);
      }
    };
    getPlaybackState();
  }, [token]);

  return (
    <Container>
      <div className="spotify__body">
        <Sidebar
          userInfo={userInfo}
          setSelectedPlaylistId={setSelectedPlaylistId}
          token={token}
        />
        <div className="body" ref={bodyRef} onScroll={bodyScrolled}>
          <Navbar $navBackground={navBackground} userInfo={userInfo} />
          <div className="body__contents">
            <Body
              $headerBackground={headerBackground}
              token={token}
              playerState={playerState}
              selectedPlaylistId={selectedPlaylistId}
            />
          </div>
        </div>
      </div>
      <div className="spotify__footer">
        <Footer token={token} playerState={playerState} />
      </div>
    </Container>
  );
}

const Container = styled.div`
  max-width: 100vw;
  max-height: 100vh;
  overflow: hidden;
  display: grid;
  grid-template-rows: 85vh 15vh;

  .spotify__body {
    display: grid;
    grid-template-columns: 15vw 85vw;
    height: 100%;
    width: 100%;
    background: linear-gradient(transparent, rgba(0, 0, 0, 1));
    background-color: rgb(32, 87, 100);

    .body {
      height: 100%;
      width: 100%;
      overflow: auto;

      &::-webkit-scrollbar {
        width: 0.7rem;

        &-thumb {
          background-color: rgba(255, 255, 255, 0.6);
        }
      }
    }
  }
`;
