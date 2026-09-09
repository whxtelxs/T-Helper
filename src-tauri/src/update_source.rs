use std::{
    fs::{self, File},
    io::{Read, Write},
    path::Path,
    sync::mpsc::Sender,
    time::{Duration, Instant},
};
use velopack::{bundle::Manifest, sources::UpdateSource, Error, VelopackAsset, VelopackAssetFeed};

const MAX_FEED_BYTES: u64 = 2 * 1024 * 1024;
const MAX_PACKAGE_BYTES: u64 = 512 * 1024 * 1024;
#[derive(Clone)]
pub struct HttpSource {
    base: url::Url,
    deadline: Instant,
}

impl HttpSource {
    pub fn new(base: &str, deadline: Instant) -> Result<Self, Error> {
        let base = url::Url::parse(&(base.trim_end_matches('/').to_owned() + "/"))?;
        let loopback = match base.host() {
            Some(url::Host::Ipv4(address)) => address.is_loopback(),
            Some(url::Host::Ipv6(address)) => address.is_loopback(),
            Some(url::Host::Domain("localhost")) => true,
            _ => false,
        };
        if !(base.scheme() == "https" || base.scheme() == "http" && loopback)
            || !base.username().is_empty()
            || base.password().is_some()
            || base.query().is_some()
            || base.fragment().is_some()
        {
            return Err(Error::Other("invalid-source".into()));
        }
        Ok(Self { base, deadline })
    }

    fn asset_url(&self, name: &str) -> Result<url::Url, Error> {
        if name.is_empty() || name == "." || name == ".." || name.contains(['/', '\\', ':']) {
            return Err(Error::Other("invalid-asset-name".into()));
        }
        let mut url = self.base.clone();
        url.path_segments_mut()
            .map_err(|_| Error::Other("invalid-source".into()))?
            .pop_if_empty()
            .push(name);
        Ok(url)
    }

    fn response(&self, url: &url::Url) -> Result<ureq::http::Response<ureq::Body>, Error> {
        let remaining = self
            .deadline
            .checked_duration_since(Instant::now())
            .filter(|time| !time.is_zero())
            .ok_or_else(|| Error::Other("network: timeout".into()))?;
        let agent: ureq::Agent = ureq::Agent::config_builder()
            .https_only(self.base.scheme() == "https")
            .timeout_global(Some(remaining))
            .timeout_connect(Some(remaining.min(Duration::from_secs(10))))
            .timeout_recv_response(Some(remaining.min(Duration::from_secs(12))))
            .user_agent("T-Helper-updater")
            .build()
            .into();
        Ok(agent.get(url.as_str()).call()?)
    }
}

impl UpdateSource for HttpSource {
    fn get_release_feed(
        &self,
        channel: &str,
        _app: &Manifest,
        _staged_user_id: &str,
    ) -> Result<VelopackAssetFeed, Error> {
        let url = self.asset_url(&format!("releases.{channel}.json"))?;
        let mut bytes = Vec::new();
        self.response(&url)?
            .into_body()
            .into_reader()
            .take(MAX_FEED_BYTES + 1)
            .read_to_end(&mut bytes)
            .map_err(|error| Error::Other(format!("network: {error}")))?;
        if bytes.len() as u64 > MAX_FEED_BYTES {
            return Err(Error::Other("feed-too-large".into()));
        }
        let feed: VelopackAssetFeed = serde_json::from_slice(&bytes)?;
        for asset in &feed.Assets {
            self.asset_url(&asset.FileName)?;
        }
        Ok(feed)
    }

    fn download_release_entry(
        &self,
        asset: &VelopackAsset,
        local_file: &Path,
        progress: Option<Sender<i16>>,
    ) -> Result<(), Error> {
        if asset.Size == 0 || asset.Size > MAX_PACKAGE_BYTES {
            return Err(Error::Other("invalid-package-size".into()));
        }
        let mut reader = self
            .response(&self.asset_url(&asset.FileName)?)?
            .into_body()
            .into_reader();
        let mut file = File::create(local_file)?;
        let result = (|| {
            let mut buffer = [0u8; 64 * 1024];
            let mut total = 0u64;
            let mut last = -1;
            loop {
                let count = reader
                    .read(&mut buffer)
                    .map_err(|error| Error::Other(format!("network: {error}")))?;
                if count == 0 {
                    break;
                }
                total += count as u64;
                if total > asset.Size {
                    return Err(Error::Other("package-size-mismatch".into()));
                }
                file.write_all(&buffer[..count])?;
                let percent = (total * 100 / asset.Size) as i16;
                if percent != last {
                    if let Some(ref sender) = progress {
                        let _ = sender.send(percent);
                    }
                    last = percent;
                }
            }
            if total != asset.Size {
                return Err(Error::Other("network: incomplete-package".into()));
            }
            file.sync_all()?;
            Ok(())
        })();
        drop(file);
        drop(reader);
        if result.is_err() {
            let _ = fs::remove_file(local_file);
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{net::TcpListener, thread};
    #[test]
    fn rejects_unencrypted_remote_sources_and_url_credentials() {
        for source in [
            "http://example.com/releases",
            "file:///tmp/releases",
            "https://user:secret@example.com/releases",
            "https://example.com/releases?query=1",
            "https://example.com/releases#fragment",
        ] {
            assert!(HttpSource::new(source, Instant::now()).is_err());
        }
        assert!(HttpSource::new("https://example.com/releases", Instant::now()).is_ok());
    }
    #[test]
    fn refuses_path_traversal() {
        let source = HttpSource::new(
            "https://example.com/releases",
            Instant::now() + Duration::from_secs(1),
        )
        .unwrap();
        for name in ["../evil", "a/b", "a\\b", "C:evil", "..", ""] {
            assert!(source.asset_url(name).is_err());
        }
        assert_eq!(
            source.asset_url("app-1.0.0.nupkg").unwrap().as_str(),
            "https://example.com/releases/app-1.0.0.nupkg"
        );
    }
    #[test]
    fn stalled_response_body_times_out_and_closes_socket() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let server = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            stream
                .set_read_timeout(Some(Duration::from_secs(3)))
                .unwrap();
            let mut request = [0u8; 4096];
            assert!(stream.read(&mut request).unwrap() > 0);
            stream
                .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 100\r\nConnection: close\r\n\r\nx")
                .unwrap();
            match stream.read(&mut request) {
                Ok(0) => true,
                Err(error) => matches!(
                    error.kind(),
                    std::io::ErrorKind::ConnectionReset | std::io::ErrorKind::ConnectionAborted
                ),
                _ => false,
            }
        });
        let source = HttpSource::new(
            &format!("http://{address}"),
            Instant::now() + Duration::from_millis(200),
        )
        .unwrap();
        let response = source.response(&source.asset_url("file").unwrap()).unwrap();
        let mut bytes = Vec::new();
        assert!(response
            .into_body()
            .into_reader()
            .read_to_end(&mut bytes)
            .is_err());
        assert!(server.join().unwrap());
    }

    #[test]
    fn expired_deadline_never_starts_a_request() {
        let source = HttpSource::new("http://127.0.0.1:1", Instant::now()).unwrap();
        assert!(source
            .response(&source.asset_url("file").unwrap())
            .unwrap_err()
            .to_string()
            .contains("timeout"));
    }
}
