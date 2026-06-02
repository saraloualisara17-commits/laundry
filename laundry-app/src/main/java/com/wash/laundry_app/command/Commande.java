package com.wash.laundry_app.command;

import com.wash.laundry_app.clients.Client;
import com.wash.laundry_app.command.attempts.OrderAttempt;
import com.wash.laundry_app.users.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "commandes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Commande {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;



    @Column(name = "numero_commande", unique = true, nullable = false, length = 50)
    private String numeroCommande;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private CommandeStatus status = CommandeStatus.PENDING_PICKUP;

    @Column(name = "date_creation", updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_validation")
    private LocalDateTime dateValidation;

    @Column(name = "date_livraison")
    private LocalDateTime dateLivraison;

    /** Set once when montantPaye first reaches montantTotal on a DELIVERED order. Never reset. */
    @Column(name = "debt_settled_at")
    private LocalDateTime debtSettledAt;

    @Column(name = "montant_total", precision = 10, scale = 2)
    private BigDecimal montantTotal = BigDecimal.ZERO;

    @Column(name = "montant_paye", precision = 10, scale = 2)
    private BigDecimal montantPaye = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_paiement")
    private ModePaiement modePaiement;

    @Column(name = "date_paiement")
    private LocalDateTime datePaiement;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_commande", length = 20)
    private ModeCommande mode; // IMMEDIATE, SCHEDULED

    @Column(name = "delivery_type", length = 50)
    private String deliveryType;

    @Column(name = "scheduled_pickup_date")
    private LocalDateTime scheduledPickupDate;

    @Column(name = "scheduled_delivery_date")
    private LocalDateTime scheduledDeliveryDate;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "delivery_address", columnDefinition = "TEXT")
    private String deliveryAddress;

    @Column(name = "delivery_latitude", precision = 10, scale = 8)
    private java.math.BigDecimal deliveryLatitude;

    @Column(name = "delivery_longitude", precision = 11, scale = 8)
    private java.math.BigDecimal deliveryLongitude;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_driver_id")
    private User livreur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_driver_id")
    private User deliveryDriver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @Column(name = "self_submitted", nullable = false)
    private boolean selfSubmitted = false;

    /** NULL = single-branch mode; set when multi-branch is activated. */
    @Column(name = "branch_id")
    private Long branchId;

    /**
     * Client-generated UUID sent at order creation time.
     * The DB UNIQUE index on this column prevents a double-submitted order
     * from being created twice — the second INSERT throws a constraint
     * violation which the service layer maps to an idempotent 200 response.
     * NULL for orders created before this field was introduced.
     */
    @Column(name = "creation_idempotency_key", length = 64, unique = true)
    private String creationIdempotencyKey;

    /**
     * Optimistic locking — prevents concurrent status overwrites.
     * If two users update the same order simultaneously, the second
     * update will throw an OptimisticLockException instead of
     * silently overwriting the first.
     */
    @Version
    @Column(name = "version")
    private Long version;

    @OneToMany(mappedBy = "commande", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CommandeTapis> commandeTapis = new ArrayList<>();

    @OneToMany(mappedBy = "commande", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CommandeImage> images = new ArrayList<>();

    @OneToMany(mappedBy = "commande", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Paiement> paiements = new ArrayList<>();

    @OneToMany(mappedBy = "commande", fetch = FetchType.LAZY)
    @OrderBy("attemptedAt ASC")
    private List<OrderAttempt> attempts = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Explicit Getters/Setters to bypass Lombok failures
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Client getClient() {
        return client;
    }

    public void setClient(Client client) {
        this.client = client;
    }

    public User getLivreur() {
        return livreur;
    }

    public void setLivreur(User livreur) {
        this.livreur = livreur;
    }

    /**
     * Semantic alias for {@link #getLivreur()} — use this in all new code.
     * The field is stored as pickup_driver_id in the database.
     */
    public User getPickupDriver() {
        return livreur;
    }

    /**
     * Semantic alias for {@link #setLivreur(User)} — use this in all new code.
     */
    public void setPickupDriver(User pickupDriver) {
        this.livreur = pickupDriver;
    }

    public String getNumeroCommande() {
        return numeroCommande;
    }

    public void setNumeroCommande(String numeroCommande) {
        this.numeroCommande = numeroCommande;
    }

    public CommandeStatus getStatus() {
        return status;
    }

    public void setStatus(CommandeStatus status) {
        this.status = status;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }

    public LocalDateTime getDateValidation() {
        return dateValidation;
    }

    public void setDateValidation(LocalDateTime dateValidation) {
        this.dateValidation = dateValidation;
    }

    public LocalDateTime getDateLivraison() {
        return dateLivraison;
    }

    public void setDateLivraison(LocalDateTime dateLivraison) {
        this.dateLivraison = dateLivraison;
    }

    public LocalDateTime getDebtSettledAt() {
        return debtSettledAt;
    }

    public void setDebtSettledAt(LocalDateTime debtSettledAt) {
        this.debtSettledAt = debtSettledAt;
    }

    public BigDecimal getMontantTotal() {
        return montantTotal;
    }

    public void setMontantTotal(BigDecimal montantTotal) {
        this.montantTotal = montantTotal;
    }

    public ModePaiement getModePaiement() {
        return modePaiement;
    }

    public void setModePaiement(ModePaiement modePaiement) {
        this.modePaiement = modePaiement;
    }

    public LocalDateTime getDatePaiement() {
        return datePaiement;
    }

    public void setDatePaiement(LocalDateTime datePaiement) {
        this.datePaiement = datePaiement;
    }

    public BigDecimal getMontantPaye() {
        return montantPaye;
    }

    public void setMontantPaye(BigDecimal montantPaye) {
        this.montantPaye = montantPaye;
    }

    public List<CommandeTapis> getCommandeTapis() {
        return commandeTapis;
    }

    public void setCommandeTapis(List<CommandeTapis> commandeTapis) {
        this.commandeTapis = commandeTapis;
    }

    public List<Paiement> getPaiements() {
        return paiements;
    }

    public void setPaiements(List<Paiement> paiements) {
        this.paiements = paiements;
    }

    public List<OrderAttempt> getAttempts() {
        return attempts;
    }

    public void setAttempts(List<OrderAttempt> attempts) {
        this.attempts = attempts;
    }

    public ModeCommande getMode() {
        return mode;
    }

    public void setMode(ModeCommande mode) {
        this.mode = mode;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        dateCreation = LocalDateTime.now();

        // Auto-generate order number if not set
        if (numeroCommande == null) {
            numeroCommande = generateOrderNumber();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isSelfSubmitted() { return selfSubmitted; }
    public void setSelfSubmitted(boolean selfSubmitted) { this.selfSubmitted = selfSubmitted; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }
    public java.math.BigDecimal getDeliveryLatitude() { return deliveryLatitude; }
    public void setDeliveryLatitude(java.math.BigDecimal deliveryLatitude) { this.deliveryLatitude = deliveryLatitude; }
    public java.math.BigDecimal getDeliveryLongitude() { return deliveryLongitude; }
    public void setDeliveryLongitude(java.math.BigDecimal deliveryLongitude) { this.deliveryLongitude = deliveryLongitude; }

    public LocalDateTime getScheduledPickupDate() { return scheduledPickupDate; }
    public void setScheduledPickupDate(LocalDateTime scheduledPickupDate) { this.scheduledPickupDate = scheduledPickupDate; }

    public LocalDateTime getScheduledDeliveryDate() { return scheduledDeliveryDate; }
    public void setScheduledDeliveryDate(LocalDateTime scheduledDeliveryDate) { this.scheduledDeliveryDate = scheduledDeliveryDate; }

    public String getCreationIdempotencyKey() { return creationIdempotencyKey; }
    public void setCreationIdempotencyKey(String k) { this.creationIdempotencyKey = k; }

    // Generates a unique order number. Uses UUID suffix instead of currentTimeMillis
    // to eliminate the race condition where two concurrent inserts at the same
    // millisecond produced identical numbers and hit the UNIQUE constraint.
    private String generateOrderNumber() {
        String suffix = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return "CMD-" + LocalDateTime.now().getYear() + "-" + suffix;
    }

    // Helper method to add tapis to order
    public void addTapis(CommandeTapis tapis) {
        commandeTapis.add(tapis);
        tapis.setCommande(this);
        recalculateTotal();
    }

    // Helper method to remove tapis from order
    public void removeTapis(CommandeTapis tapis) {
        commandeTapis.remove(tapis);
        tapis.setCommande(null);
        recalculateTotal();
    }

    // Recalculate total amount
    public void recalculateTotal() {
        this.montantTotal = commandeTapis.stream()
                .map(CommandeTapis::getSousTotal)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}