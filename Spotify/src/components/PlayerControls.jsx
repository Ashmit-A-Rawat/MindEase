// src/spotify/PlayerControls.jsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  BsFillPlayCircleFill,
  BsFillPauseCircleFill,
  BsShuffle,
} from "react-icons/bs";
import { CgPlayTrackNext, CgPlayTrackPrev } from "react-icons/cg";
import { FiRepeat } from "react-icons/fi";
import axios from "axios";

export default function PlayerControls() {
  const [token, setToken] = useState("");
  const [playerState, setPlayerState] = useState(false);
  const [, setCurrentPlaying] = useState(null);

  // Load token from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const getActiveDeviceId = async () => {
    try {
      const devicesRes = await axios.get("https://api.spotify.com/v1/me/player/devices", {
        headers: { Authorization: "Bearer " + token },
      });
      const devices = devicesRes.data.devices;
      if (!devices.length) {
        console.error("No active Spotify device found. Open Spotify on a device first.");
        return null;
      }
      return devices[0].id;
    } catch (err) {
      console.error("Error fetching devices:", err);
      return null;
    }
  };

  const changeState = async () => {
    if (!token) return;
    try {
      const deviceId = await getActiveDeviceId();
      if (!deviceId) return;

      const state = playerState ? "pause" : "play";
      await axios.put(
        `https://api.spotify.com/v1/me/player/${state}?device_id=${deviceId}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
        }
      );
      setPlayerState(!playerState);
    } catch (error) {
      console.error("Error changing player state:", error);
    }
  };

  const changeTrack = async (type) => {
    if (!token) return;
    try {
      const deviceId = await getActiveDeviceId();
      if (!deviceId) return;

      await axios.post(
        `https://api.spotify.com/v1/me/player/${type}?device_id=${deviceId}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
        }
      );

      setPlayerState(true);

      const response1 = await axios.get(
        "https://api.spotify.com/v1/me/player/currently-playing",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
        }
      );

      if (response1.data && response1.data.item) {
        const currentPlaying = {
          id: response1.data.item.id,
          name: response1.data.item.name,
          artists: response1.data.item.artists.map((artist) => artist.name),
          image: response1.data.item.album.images[2].url,
        };
        setCurrentPlaying(currentPlaying);
      } else {
        setCurrentPlaying(null);
      }
    } catch (error) {
      console.error(`Error changing track (${type}):`, error);
    }
  };

  return (
    <Container>
      <div className="shuffle">
        <BsShuffle />
      </div>
      <div className="previous">
        <CgPlayTrackPrev onClick={() => changeTrack("previous")} />
      </div>
      <div className="state">
        {playerState ? (
          <BsFillPauseCircleFill onClick={changeState} />
        ) : (
          <BsFillPlayCircleFill onClick={changeState} />
        )}
      </div>
      <div className="next">
        <CgPlayTrackNext onClick={() => changeTrack("next")} />
      </div>
      <div className="repeat">
        <FiRepeat />
      </div>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  svg {
    color: #b3b3b3;
    transition: 0.2s ease-in-out;
    &:hover {
      color: white;
    }
  }
  .state {
    svg {
      color: white;
    }
  }
  .previous,
  .next,
  .state {
    font-size: 2rem;
  }
`;
