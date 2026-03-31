"""Generate a self-signed SSL certificate for local HTTPS access."""
import subprocess
import os
import sys

CERT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "certs")
CERT_FILE = os.path.join(CERT_DIR, "cert.pem")
KEY_FILE = os.path.join(CERT_DIR, "key.pem")

def generate():
    os.makedirs(CERT_DIR, exist_ok=True)
    
    if os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE):
        print(f"[OK] SSL certificates already exist at {CERT_DIR}")
        return
    
    # Try using Python's built-in ssl/cryptography if available
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        import datetime
        import ipaddress
        
        # Generate private key
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        
        # Get local IP
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        except:
            local_ip = "192.168.1.1"
        finally:
            s.close()
        
        # Build certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, "AttendanceAI"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "AttendanceAI Local"),
        ])
        
        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.datetime.utcnow())
            .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365))
            .add_extension(
                x509.SubjectAlternativeName([
                    x509.DNSName("localhost"),
                    x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                    x509.IPAddress(ipaddress.IPv4Address(local_ip)),
                ]),
                critical=False,
            )
            .sign(key, hashes.SHA256())
        )
        
        with open(KEY_FILE, "wb") as f:
            f.write(key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.TraditionalOpenSSL,
                serialization.NoEncryption(),
            ))
        
        with open(CERT_FILE, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        print(f"[OK] SSL certificate generated for localhost + {local_ip}")
        print(f"     cert: {CERT_FILE}")
        print(f"     key:  {KEY_FILE}")
        return
        
    except ImportError:
        pass
    
    # Fallback: use openssl command
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        except:
            local_ip = "192.168.1.1"
        finally:
            s.close()
        
        subprocess.run([
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", KEY_FILE, "-out", CERT_FILE,
            "-days", "365", "-nodes",
            "-subj", f"/CN=AttendanceAI",
            "-addext", f"subjectAltName=DNS:localhost,IP:127.0.0.1,IP:{local_ip}",
        ], check=True)
        print(f"[OK] SSL certificate generated via openssl for {local_ip}")
        return
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass
    
    print("[ERROR] Could not generate SSL certificate.")
    print("Install cryptography: pip install cryptography")
    print("Or install OpenSSL and add it to PATH")
    sys.exit(1)


if __name__ == "__main__":
    generate()
